import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for a single text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Generate embedding vectors for multiple texts in a single API call.
 * OpenAI supports batching up to 2048 inputs for text-embedding-3-small.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  // Sort by index to preserve input order
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/**
 * Build the embedding text for a scene by combining its key fields.
 * This gives the richest semantic signal for vector search.
 */
export function buildSceneEmbeddingText(scene: {
  location: string;
  country: string;
  era: string;
  description: string;
  sounds: string[];
}): string {
  return `${scene.location}, ${scene.country}, ${scene.era}. ${scene.description}. Sounds: ${scene.sounds.join(", ")}`;
}
