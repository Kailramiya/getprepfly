import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PrepFly — AI-Powered PTE Practice Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #4f46e5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Logo wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span style={{ fontSize: 90, fontWeight: 900, color: "white", letterSpacing: "-3px", lineHeight: 1 }}>
            Prep
          </span>
          <span style={{ fontSize: 90, fontWeight: 900, color: "#5eead4", letterSpacing: "-3px", lineHeight: 1 }}>
            Fly
          </span>
        </div>

        {/* Domain */}
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", marginTop: 6, letterSpacing: 2 }}>
          getprepfly.com
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 32, color: "rgba(255,255,255,0.90)", marginTop: 28, textAlign: "center", fontWeight: 600 }}>
          AI-Powered PTE Academic Practice Platform
        </div>

        {/* Module pills */}
        <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
          {["🎤 Speaking", "✏️ Writing", "📖 Reading", "🎧 Listening"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: 40,
                padding: "12px 26px",
                color: "white",
                fontSize: 22,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Score pill */}
        <div style={{
          marginTop: 44,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 50,
          padding: "10px 32px",
          color: "rgba(255,255,255,0.85)",
          fontSize: 20,
          border: "1px solid rgba(255,255,255,0.2)",
        }}>
          Score 79+ · All 22 question types · Free during beta
        </div>
      </div>
    ),
    { ...size },
  );
}
