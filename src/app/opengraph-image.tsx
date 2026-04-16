import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Jungle Safari — Hear the Sound, Tap the Animal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #062a1e 0%, #0d3b2e 50%, #062a1e 100%)",
          position: "relative",
        }}
      >
        {/* Decorative safari foliage silhouettes */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 60px 0",
            fontSize: 240,
            lineHeight: 1,
          }}
        >
          <span>🌿</span>
          <span>🐾</span>
          <span>🌴</span>
        </div>

        {/* Leading row of animals */}
        <div
          style={{
            fontSize: 88,
            display: "flex",
            gap: 20,
            marginBottom: 24,
          }}
        >
          🐘 🦁 🦒 🐵 🦜
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 108,
              fontWeight: 900,
              color: "#f4a72b",
              letterSpacing: "-2px",
              lineHeight: 1,
              marginBottom: "16px",
            }}
          >
            Jungle Safari
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#fff4d6",
              fontWeight: 600,
              marginBottom: "40px",
              opacity: 0.9,
            }}
          >
            Hear the sound. Tap the animal. Earn safari badges.
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              fontSize: 18,
              color: "#fff4d6",
              opacity: 0.75,
              fontWeight: 700,
            }}
          >
            <span style={{ color: "#f4a72b" }}>ElevenLabs</span>
            <span>+</span>
            <span style={{ color: "#88c34a" }}>turbopuffer</span>
            <span>+</span>
            <span style={{ color: "#fff4d6" }}>Upstash</span>
            <span>|</span>
            <span style={{ fontWeight: 800 }}>#ElevenHacks</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
