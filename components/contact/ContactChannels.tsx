import { Clock, EnvelopeSimple, FacebookLogo } from '@phosphor-icons/react/dist/ssr';
import { SITE } from '@/config/site';

const card = 'flex items-center gap-3 rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 transition-colors';

/** Other ways to reach us, shown beside the form. */
export function ContactChannels() {
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <li>
        <a href={`mailto:${SITE.email}`} className={`${card} hover:border-accent`}>
          <EnvelopeSimple aria-hidden weight="duotone" className="size-7 shrink-0 text-accent" />
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-widest text-faint">Email</span>
            <span className="block truncate text-sm font-bold text-fg">{SITE.email}</span>
          </span>
        </a>
      </li>
      <li>
        <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className={`${card} hover:border-accent`}>
          <FacebookLogo aria-hidden weight="duotone" className="size-7 shrink-0 text-accent" />
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-widest text-faint">Facebook</span>
            <span className="block truncate text-sm font-bold text-fg">Message our page</span>
          </span>
        </a>
      </li>
      <li className={`${card} sm:col-span-2`}>
        <Clock aria-hidden weight="duotone" className="size-7 shrink-0 text-accent" />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-widest text-faint">Response time</span>
          <span className="block text-sm font-bold text-fg">Usually within a few days</span>
        </span>
      </li>
    </ul>
  );
}
