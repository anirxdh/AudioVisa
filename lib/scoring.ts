/**
 * Vector distance scoring utilities for Audio Visa.
 * Standalone cosine distance + score mapping — no external dependencies.
 */

/**
 * Compute cosine similarity between two vectors.
 * Returns a value in [-1, 1] where 1 = identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector length mismatch: ${a.length} vs ${b.length}`
    );
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dot / magnitude;
}

/**
 * Compute cosine distance between two vectors.
 * Returns a value in [0, 2] where 0 = identical.
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Map cosine distance to a game score (0-1000).
 *
 * Uses a quadratic curve that rewards close guesses:
 *   score = (1 - distance)^2 * 1000
 *
 * Distance 0.0 => 1000 pts (perfect match)
 * Distance 0.1 => 810 pts
 * Distance 0.3 => 490 pts
 * Distance 0.5 => 250 pts
 * Distance 1.0 => 0 pts
 *
 * If hint was used, cap at 800.
 */
export function distanceToScore(
  distance: number,
  hintUsed: boolean
): number {
  // Clamp distance to [0, 1] — beyond 1 means opposite vectors, score 0
  const clampedDistance = Math.min(1, Math.max(0, distance));
  const raw = Math.round(Math.pow(1 - clampedDistance, 2) * 1000);
  const maxScore = hintUsed ? 800 : 1000;
  return Math.min(raw, maxScore);
}
