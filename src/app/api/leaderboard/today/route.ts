import { NextResponse } from "next/server";
import { getRedis, KEYS, todayKey } from "../../../../../lib/upstash";

/**
 * GET /api/leaderboard/today
 *
 * Returns top 10 scores for today's daily challenge.
 */
export async function GET() {
  try {
    const redis = getRedis();
    const today = todayKey();
    const boardKey = KEYS.dailyBoard(today);

    const raw = await redis.zrange<string[]>(boardKey, 0, 9, {
      rev: true,
      withScores: true,
    });

    const entries: { rank: number; nickname: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const member = raw[i] as string;
      const score = Number(raw[i + 1]);
      const nickname = String(member).split("#")[0];
      entries.push({ rank: entries.length + 1, nickname, score });
    }

    return NextResponse.json({ date: today, entries });
  } catch (error) {
    console.error("[leaderboard/today] Error:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}
