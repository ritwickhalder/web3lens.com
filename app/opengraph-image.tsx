import { ImageResponse } from 'next/og';
import { SITE } from '@/config/site';

export const alt = 'Blockchain Explorer | Blockchain Search Engine';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f88f2',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700 }}>{SITE.domain}</div>
        <div style={{ fontSize: 44, marginTop: 24 }}>Blockchain Search Engine</div>
        <div style={{ fontSize: 28, marginTop: 24, opacity: 0.85 }}>
          Search any blockchain for any address, transaction, block or data
        </div>
      </div>
    ),
    size,
  );
}
