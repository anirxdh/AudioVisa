import Turbopuffer from "@turbopuffer/turbopuffer";

if (!process.env.TURBOPUFFER_API_KEY) {
  console.warn(
    "[turbopuffer] TURBOPUFFER_API_KEY is not set. Client will fail on requests."
  );
}

export const tpuf = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY ?? "",
  region: (process.env.TURBOPUFFER_REGION as "gcp-us-east4") || "gcp-us-east4",
});

export const NAMESPACE = "soundguessr-scenes";

export function getNamespace() {
  return tpuf.namespace(NAMESPACE);
}
