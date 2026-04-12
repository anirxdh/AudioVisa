import Turbopuffer from "@turbopuffer/turbopuffer";

export const NAMESPACE = "soundguessr-scenes";

/** Lazy-initialized turbopuffer client (reads env at call time, not import time). */
let _tpuf: Turbopuffer | null = null;
function getTpuf(): Turbopuffer {
  if (!_tpuf) {
    if (!process.env.TURBOPUFFER_API_KEY) {
      console.warn(
        "[turbopuffer] TURBOPUFFER_API_KEY is not set. Client will fail on requests."
      );
    }
    _tpuf = new Turbopuffer({
      apiKey: process.env.TURBOPUFFER_API_KEY ?? "",
      region:
        (process.env.TURBOPUFFER_REGION as "gcp-us-east4") || "gcp-us-east4",
    });
  }
  return _tpuf;
}

export function getNamespace() {
  return getTpuf().namespace(NAMESPACE);
}
