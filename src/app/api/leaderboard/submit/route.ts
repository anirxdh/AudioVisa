import { NextRequest, NextResponse } from "next/server";
import { getGame, saveGame } from "../../../../../lib/game-engine";
import { getRedis, KEYS, todayKey } from "../../../../../lib/upstash";

interface SubmitBody {
  gameId: string;
  nickname: string;
}

const NICK_RE = /^[a-zA-Z0-9 _-]{1,20}$/;
const DAILY_BOARD_TTL_SECONDS = 60 * 60 * 48; // 48h

/**
 * POST /api/leaderboard/submit
 *
 * Body: { gameId, nickname }
 *
 * Submits a finished daily game's score. Deterministic member key
 * `{nickname}#{gameId}` so double-submits overwrite the same row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody;
    const { gameId, nickname } = body;

    if (!gameId || !nickname) {
      return NextResponse.json(
        { error: "Missing gameId or nickname" },
        { status: 400 }
      );
    }
    if (!NICK_RE.test(nickname)) {
      return NextResponse.json(
        { error: "Nickname must be 1-20 chars (letters, numbers, space, _ or -)" },
        { status: 400 }
      );
    }

    const game = await getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (game.status !== "finished") {
      return NextResponse.json(
        { error: "Game not finished yet" },
        { status: 400 }
      );
    }
    if (game.mode !== "daily") {
      return NextResponse.json({ submitted: false });
    }

    const redis = getRedis();
    const today = todayKey();
    const boardKey = KEYS.dailyBoard(today);
    const member = `${nickname}#${gameId}`;

    await redis.zadd(boardKey, { score: game.totalScore, member });
    await redis.expire(boardKey, DAILY_BOARD_TTL_SECONDS);

    game.submittedToLeaderboard = true;
    game.nickname = nickname;
    await saveGame(game);

    const rank = await redis.zrevrank(boardKey, member);
    const total = await redis.zcard(boardKey);

    return NextResponse.json({
      submitted: true,
      rank: rank === null ? null : rank + 1,
      total,
      score: game.totalScore,
    });
  } catch (error) {
    console.error("[leaderboard/submit] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit score" },
      { status: 500 }
    );
  }
}
