import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07080c' }}>
        <svg viewBox="0 0 32 32" width="140" height="140">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c6f24e" />
              <stop offset="0.5" stopColor="#52e3cf" />
              <stop offset="1" stopColor="#8f7cff" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="12.5" fill="none" stroke="url(#g)" strokeWidth="2.5" />
          <path d="M16 10.5 21 13.25v5.5L16 21.5l-5-2.75v-5.5z" fill="url(#g)" />
        </svg>
      </div>
    ),
    size,
  );
}
