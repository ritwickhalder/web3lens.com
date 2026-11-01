import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1622' }}>
        <svg viewBox="0 0 32 32" width="132" height="132" fill="none" stroke="#4fd1ff">
          <circle cx="16" cy="16" r="11.5" strokeWidth="1.75" />
          <path d="M16 2v4M16 26v4M2 16h4M26 16h4" strokeWidth="1.5" />
          <path d="M16 11.5 20 13.75v4.5L16 20.5l-4-2.25v-4.5z" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
