import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Brand mark: gradient "M" matching the header logo
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          fontSize: 22,
          fontWeight: 700,
          color: "white",
          background:
            "linear-gradient(135deg, #1f6f5c 0%, #248a80 55%, #2f5d8c 100%)",
        }}
      >
        M
      </div>
    ),
    {
      ...size,
    }
  );
}
