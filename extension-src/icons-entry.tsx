/**
 * Build-time only (scripts/build-extensions.mjs runs this in Node): renders the website's own icon
 * components to static SVG strings, so the extensions show the same coin logos and UI icons without
 * shipping React. The strings are compiled into the bundles; nothing is fetched at run time.
 */
import {
  ArrowRight,
  ArrowSquareOut,
  BookmarkSimple,
  BracketsCurly,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  CloudSlash,
  Copy,
  Desktop,
  GasPump,
  GearSix,
  Hash,
  Info,
  LinkSimple,
  ListChecks,
  MagnifyingGlass,
  Moon,
  QrCode,
  Receipt,
  Scales,
  Scan,
  ShieldCheck,
  ShieldWarning,
  Star,
  Sun,
  Trash,
  Warning,
  Wrench,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHAIN_ICONS } from '@/components/search/ChainGlyph';

const UI = {
  arrowRight: ArrowRight,
  external: ArrowSquareOut,
  bookmark: BookmarkSimple,
  brackets: BracketsCurly,
  caret: CaretDown,
  check: Check,
  checkCircle: CheckCircle,
  clock: Clock,
  history: ClockCounterClockwise,
  cloudSlash: CloudSlash,
  copy: Copy,
  desktop: Desktop,
  gas: GasPump,
  gear: GearSix,
  hash: Hash,
  info: Info,
  link: LinkSimple,
  list: ListChecks,
  search: MagnifyingGlass,
  moon: Moon,
  qr: QrCode,
  receipt: Receipt,
  scales: Scales,
  scan: Scan,
  shield: ShieldCheck,
  shieldWarning: ShieldWarning,
  star: Star,
  sun: Sun,
  trash: Trash,
  warning: Warning,
  wrench: Wrench,
  x: X,
};

export type UiIconName = keyof typeof UI;

export function renderIcons(): { ui: Record<string, string>; uiDuotone: Record<string, string>; chains: Record<string, string> } {
  const ui: Record<string, string> = {};
  const uiDuotone: Record<string, string> = {};
  for (const [name, Icon] of Object.entries(UI)) {
    ui[name] = renderToStaticMarkup(<Icon weight="bold" aria-hidden />);
    uiDuotone[name] = renderToStaticMarkup(<Icon weight="duotone" aria-hidden />);
  }
  const chains: Record<string, string> = {};
  for (const [id, Icon] of Object.entries(CHAIN_ICONS)) chains[id] = renderToStaticMarkup(<Icon variant="background" aria-hidden />);
  return { ui, uiDuotone, chains };
}
