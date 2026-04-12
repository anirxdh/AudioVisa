import { getNamespace } from "./turbopuffer";
import { generateEmbedding } from "./embeddings";

export interface SearchResult {
  id: string;
  distance: number;
  location: string;
  country: string;
  continent: string;
  era: string;
  difficulty: string;
  description: string;
  sounds: string[];
  sfx_prompts: string[];
  music_prompt: string;
  category: string;
}

const SCENE_ATTRIBUTES = [
  "location",
  "country",
  "continent",
  "era",
  "difficulty",
  "description",
  "sounds",
  "sfx_prompts",
  "music_prompt",
  "category",
] as const;

/**
 * Search scenes by semantic similarity to a query string.
 * Optionally filter by difficulty tier.
 */
export async function searchScenes(
  query: string,
  filters?: { difficulty?: string },
  topK: number = 5
): Promise<SearchResult[]> {
  const queryVector = await generateEmbedding(query);
  const ns = getNamespace();

  const queryParams: Parameters<typeof ns.query>[0] = {
    rank_by: ["vector", "ANN", queryVector],
    top_k: topK,
    include_attributes: [...SCENE_ATTRIBUTES],
  };

  if (filters?.difficulty) {
    queryParams.filters = ["difficulty", "Eq", filters.difficulty];
  }

  const result = await ns.query(queryParams);

  return (result.rows ?? []).map((row) => ({
    id: String(row.id),
    distance: row.$dist ?? 0,
    location: String(row["location"] ?? ""),
    country: String(row["country"] ?? ""),
    continent: String(row["continent"] ?? ""),
    era: String(row["era"] ?? ""),
    difficulty: String(row["difficulty"] ?? ""),
    description: String(row["description"] ?? ""),
    sounds: parseJsonArray(row["sounds"]),
    sfx_prompts: parseJsonArray(row["sfx_prompts"]),
    music_prompt: String(row["music_prompt"] ?? ""),
    category: String(row["category"] ?? ""),
  }));
}

/**
 * Parse a value that may be a JSON string array or already an array.
 */
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Not valid JSON, return as single-element array
      return [value];
    }
  }
  return [];
}
