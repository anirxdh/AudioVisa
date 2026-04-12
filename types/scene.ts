export interface Scene {
  id: string;                    // kebab-case slug e.g. "tokyo-fish-market-1990s"
  location: string;              // Specific place: "Tsukiji Fish Market, Tokyo"
  country: string;               // "Japan"
  continent: string;             // "Asia" | "Europe" | "North America" | "South America" | "Africa" | "Oceania"
  era: string;                   // Decade: "1990s"
  difficulty: "easy" | "medium" | "hard";
  description: string;           // 2-3 sentences of atmospheric prose
  sounds: string[];              // 4-6 specific sounds as plain text
  sfx_prompts: string[];         // 2-3 detailed ElevenLabs SFX prompts (min 30 chars each)
  music_prompt: string;          // 1 ElevenLabs Music API prompt
  category: SceneCategory;       // For filtering/generation tracking
}

export type SceneCategory =
  | "markets"
  | "historical"
  | "city_streets"
  | "nature"
  | "industrial"
  | "festivals"
  | "transport";

export const VALID_CATEGORIES: SceneCategory[] = [
  "markets",
  "historical",
  "city_streets",
  "nature",
  "industrial",
  "festivals",
  "transport",
];

export const VALID_DIFFICULTIES: Scene["difficulty"][] = [
  "easy",
  "medium",
  "hard",
];

export const VALID_CONTINENTS = [
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Africa",
  "Oceania",
] as const;
