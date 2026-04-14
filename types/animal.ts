export type AnimalCategory =
  | "farm"
  | "pets"
  | "wild"
  | "birds"
  | "ocean"
  | "reptiles"
  | "insects";

export interface Animal {
  id: string;            // slug, e.g. "african-lion"
  name: string;          // display name, e.g. "African Lion"
  emoji: string;         // visual flair on option buttons
  category: AnimalCategory;
  difficulty: "easy" | "medium" | "hard";
  sfx_prompt: string;    // ElevenLabs Sound Effects prompt
  description: string;   // 1-2 sentence description (shown on reveal)
  funFact: string;       // shareable trivia shown on reveal
}

export const VALID_ANIMAL_CATEGORIES: AnimalCategory[] = [
  "farm",
  "pets",
  "wild",
  "birds",
  "ocean",
  "reptiles",
  "insects",
];

export const VALID_DIFFICULTIES: Animal["difficulty"][] = [
  "easy",
  "medium",
  "hard",
];
