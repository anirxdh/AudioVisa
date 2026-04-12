# Turbopuffer TypeScript SDK Research

## Package
```bash
npm install @turbopuffer/turbopuffer
```

## Client Init
```ts
import Turbopuffer from "@turbopuffer/turbopuffer";
const tpuf = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY,
  region: "gcp-us-east4", // required
});
```

## Namespace (created implicitly on first write)
```ts
const ns = tpuf.namespace("soundguessr-scenes");
```

## Upsert
```ts
await ns.write({
  upsert_rows: [
    { id: "scene-1", vector: [...], location: "Tokyo", era: "1990s", description: "..." }
  ],
  distance_metric: "cosine_distance",
});
```

## Query (ANN vector search)
```ts
const result = await ns.query({
  rank_by: ["vector", "ANN", queryVector],
  top_k: 10,
  filters: ["difficulty", "Eq", "easy"],
  include_attributes: ["location", "era", "description", "sounds"],
});
// result.rows => [{ id, $dist, location, era, ... }]
```

## Key Gotchas
- Bring your own embeddings (use OpenAI text-embedding-3-small)
- distance_metric set on first write, can't change later
- Filter syntax: tuples `[field, operator, value]`
- `$dist` field on results (lower = closer for cosine_distance)
- Namespace created on first write, not on `tpuf.namespace()`
- Schema can be set inline: `schema: { location: { type: "string", filterable: true } }`
