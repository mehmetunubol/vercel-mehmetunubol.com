import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#0d0f16",
          backgroundImage:
            "radial-gradient(900px 500px at 50% -120px, rgba(79,140,255,0.35), transparent 70%), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 56px 56px, 56px 56px",
          color: "#f5f7fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              backgroundColor: "#4f8cff",
              color: "#0d0f16",
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ display: "flex", fontSize: "26px", color: "#9aa4b2" }}>mehmetunubol.com</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", fontSize: "88px", fontWeight: 700, letterSpacing: "-2px" }}>
            {site.name}
          </div>
          <div style={{ display: "flex", fontSize: "40px", color: "#4f8cff", fontWeight: 600 }}>
            {site.title}
          </div>
          <div style={{ display: "flex", fontSize: "28px", color: "#9aa4b2" }}>{site.tagline}</div>
        </div>

        <div style={{ display: "flex", fontSize: "24px", color: "#9aa4b2" }}>
          {site.location} · 10+ years experience
        </div>
      </div>
    ),
    { ...size },
  );
}
