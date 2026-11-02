import { encodeQr, qrSvgPath } from '@/lib/codec/qr';

/** QR code for an address, drawn as SVG on the server. Always black on white (not themed): scanners need it. */
export function QrCode({ value, label }: { value: string; label: string }) {
  let svg: { path: string; viewBox: string };
  try {
    svg = qrSvgPath(encodeQr(value));
  } catch {
    return null;
  }
  return (
    <figure className="flex flex-col items-center gap-3">
      <svg viewBox={svg.viewBox} role="img" aria-label={`QR code for ${label}`} className="size-48 rounded-lg bg-white" shapeRendering="crispEdges">
        <path d={svg.path} className="fill-black" />
      </svg>
      <figcaption className="max-w-[16rem] text-center text-xs font-semibold text-faint">
        Scan to copy the address. Always compare the first and last characters with the original before sending funds.
      </figcaption>
    </figure>
  );
}
