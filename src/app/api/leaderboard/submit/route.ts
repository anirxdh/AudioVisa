import { NextRequest, NextResponse } from "next/server";
import { getRedis, KEYS, todayKey } from "../../../../../lib/upstash";

interface SubmitBody {
  gameId?: string;
  nickname: string;
  score: number;
  mode?: string;
}

const NICK_RE = /^[a-zA-Z0-9 _-]{1,20}$/;
const DAILY_BOARD_TTL_SECONDS = 60 * 60 * 48; // 48h
const MAX_SCORE = 5000;

/**
 * POST /api/leaderboard/submit
 *
 * Body: { gameId?, nickname, score, mode }
 *
 * Writes the client-reported score to today's leaderboard. No server
 * game-state lookup (the client is source of truth for a kids' app —
 * avoids race conditions with fire-and-forget /api/game/guess writes).
 *
 * Deterministic member key `{nickname}#{gameId}` so re-submits of the
 * same game overwrite instead of stacking duplicates.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody;
    const { nickname, score, mode } = body;
    const gameId = body.gameId ?? Math.random().toString(36).slice(2, 10);

    if (!nickname || typeof nickname !== "string" || !NICK_RE.test(nickname)) {
      return NextResponse.json(
        { error: "Nickname must be 1-20 chars (letters, numbers, space, _ or -)" },
        { status: 400 }
      );
    }
    if (typeof score !== "number" || score < 0 || score > MAX_SCORE) {
      return NextResponse.json(
        { error: "Score must be between 0 and 5000" },
        { status: 400 }
      );
    }
    if (mode !== "daily") {
      // Only daily games go on the leaderboard.
      return NextResponse.json({ submitted: false });
    }

    const redis = getRedis();
    const today = todayKey();
    const boardKey = KEYS.dailyBoard(today);
    const member = `${nickname}#${gameId}`;

    await redis.zadd(boardKey, { score, member });
    await redis.expire(boardKey, DAILY_BOARD_TTL_SECONDS);

    const rank = await redis.zrevrank(boardKey, member);
    const total = await redis.zcard(boardKey);

    return NextResponse.json({
      submitted: true,
      rank: rank === null ? null : rank + 1,
      total,
      score,
    });
  } catch (error) {
    console.error("[leaderboard/submit] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit score" },
      { status: 500 }
    );
  }
}
