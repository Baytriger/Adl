import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#1f4fd8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M9 23 16 8l7 15" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 18.5h8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
