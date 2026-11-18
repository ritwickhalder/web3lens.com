import { LOCALES, LOCALE_META, localizePath, type LocalizedPath } from '@/lib/i18n/config';
import { getLocale, getTx } from '@/lib/i18n/server';

/**
 * Plain links to this page in every language, at the end of the homepage and /pricing (the translated pages). Plain
 * anchors rather than a script menu, so search engines and no-JS visitors can follow them too.
 */
/** `inset`: the page is already inside a `.wrap` container. */
export function LanguageLinks({ path, inset = false }: { path: LocalizedPath; inset?: boolean }) {
  const locale = getLocale();
  const tx = getTx();
  return (
    <nav aria-label={tx('Language')} className={inset ? 'mt-16' : 'wrap mt-24'}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-6 text-sm font-semibold">
        <span className="label">{tx('Language')}</span>
        {LOCALES.map((l) => (
          <a
            key={l}
            href={localizePath(path, l)}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? 'page' : undefined}
            className={l === locale ? 'text-accent' : 'text-muted hover:text-accent'}
          >
            {LOCALE_META[l].nativeName}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** The root layout renders `lang="en"` for every page; a translated page corrects it before first paint. */
export function HtmlLang({ locale }: { locale: string }) {
  return <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(locale)}` }} />;
}
