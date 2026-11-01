import { ImageResponse } from 'next/og';
import { SITE } from '@/config/site';
import chains from '@/data/chains.json';

export const alt = 'Web3Lens: look up anything, on any chain';
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
          justifyContent: 'space-between',
          padding: 80,
          background: 'radial-gradient(ellipse 70% 60% at 50% 0%, #2a2160 0%, #07080c 70%)',
          color: '#eef0f6',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 36, fontWeight: 700 }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, border: '6px solid #c6f24e', display: 'flex' }} />
          Web3<span style={{ color: '#c6f24e' }}>Lens</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Look up anything,</div>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: '#c6f24e' }}>
            on any chain.
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#8d93a6' }}>
          {chains.length} blockchains · addresses, transactions, blocks · {SITE.domain}
        </div>
      </div>
    ),
    size,
  );
}
