import { ImageResponse } from 'next/og';
import { SITE } from '@/config/site';
import { CHAIN_COUNT_LABEL } from '@/lib/chains';

export const alt = 'Web3Lens: look up anything, on any chain';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GRID = 'rgba(79,209,255,0.08)';

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
          padding: 72,
          backgroundColor: '#0b1622',
          backgroundImage: `linear-gradient(${GRID} 1px, transparent 1px), linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          color: '#e6eef5',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 22, color: '#4fd1ff', letterSpacing: 3 }}>
          <span>WEB3LENS</span>
          <span>SHEET 01 · BLOCKCHAIN SEARCH ENGINE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 104, fontWeight: 800, lineHeight: 1, textTransform: 'uppercase' }}>
          <span>Look up anything,</span>
          <span style={{ color: '#4fd1ff' }}>on any chain.</span>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#8fa6bc', borderTop: '2px solid #2d5273', paddingTop: 24 }}>
          {CHAIN_COUNT_LABEL} blockchains · addresses, transactions, blocks · {SITE.domain}
        </div>
      </div>
    ),
    size,
  );
}
