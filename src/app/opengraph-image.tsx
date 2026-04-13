import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Audio Visa - Guess the Sound, Earn Your Stamp";
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
          background: "linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #0a0a1a 100%)",
          position: "relative",
        }}
      >
        {/* Decorative waveform bars */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "200px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "6px",
            padding: "0 80px",
            opacity: 0.15,
          }}
        >
          {Array.from({ length: 40 }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${30 + Math.sin(i * 0.4) * 40 + 30}%`,
                background: `linear-gradient(to top, #00f0ff, #ffa500)`,
                borderRadius: "4px",
              }}
            />
          ))}
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
              fontSize: 96,
              fontWeight: 800,
              color: "#00f0ff",
              letterSpacing: "-2px",
              lineHeight: 1,
              marginBottom: "16px",
            }}
          >
            Audio Visa
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#a0a0b0",
              fontWeight: 300,
              marginBottom: "40px",
            }}
          >
            Can you guess where you are just by listening?
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              fontSize: 18,
              color: "#a0a0b0",
            }}
          >
            <span style={{ color: "#00f0ff" }}>turbopuffer</span>
            <span>+</span>
            <span style={{ color: "#ffa500" }}>ElevenLabs</span>
            <span>|</span>
            <span style={{ fontWeight: 600 }}>#ElevenHacks</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
