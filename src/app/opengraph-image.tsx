import { ImageResponse } from "next/og";

export const alt = "ADL: members, events and media in one workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0e1013", color: "#eceef2", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "#7b9cff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="44" height="44" viewBox="0 0 32 32">
              <path d="M9 23 16 8l7 15" fill="none" stroke="#0e1013" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 18.5h8" stroke="#0e1013" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>ADL</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, maxWidth: 960 }}>
            Members, events and media in one workspace.
          </div>
          <div style={{ fontSize: 30, color: "#9aa1b0" }}>Every report reads from the same data.</div>
        </div>
      </div>
    ),
    size,
  );
}
