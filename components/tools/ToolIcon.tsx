import { BracketsCurly, CheckCircle, Clock, GasPump, Hash, ListChecks, Receipt, Scales } from '@phosphor-icons/react/dist/ssr';

const ICONS = {
  'unit-converter': Scales,
  'address-validator': CheckCircle,
  'hex-converter': Hash,
  'timestamp-converter': Clock,
  'gas-calculator': GasPump,
  'abi-decoder': BracketsCurly,
  'transaction-decoder': Receipt,
  batch: ListChecks,
} as const;

export function ToolIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug as keyof typeof ICONS] ?? Hash;
  return <Icon aria-hidden weight="duotone" className={className} />;
}
