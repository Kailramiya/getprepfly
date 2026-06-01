import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Prepfly — AI-Powered PTE Practice Platform";
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
        <div style={{ fontSize: 80, fontWeight: 800, color: "white", letterSpacing: "-3px", lineHeight: 1 }}>
          Prepfly
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 30, color: "rgba(255,255,255,0.88)", marginTop: 20, textAlign: "center" }}>
          AI-Powered PTE Academic Practice
        </div>

        {/* Module pills */}
        <div style={{ display: "flex", gap: 16, marginTop: 48 }}>
          {["🎤 Speaking", "✏️ Writing", "📖 Reading", "🎧 Listening"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.18)",
                borderRadius: 40,
                padding: "12px 24px",
                color: "white",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Sub-text */}
        <div style={{ marginTop: 44, color: "rgba(255,255,255,0.65)", fontSize: 22 }}>
          Score 79+ · Free during beta · getprepfly.com
        </div>
      </div>
    ),
    { ...size },
  );
}
