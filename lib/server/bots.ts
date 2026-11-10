/**
 * Crawler detection for the live-lookup pages and /api/v1. Result pages link to more result pages (every address
 * lists transactions and counterparties), so a crawler that ignores robots.txt can walk a whole chain through
 * them, and each visit costs a server render plus several provider calls.
 *
 * The generic pattern needs "bot", "crawler" or "spider" followed by "/" or ";" (Googlebot/2.1, GPTBot/1.1,
 * PetalBot;), so phone models such as "CUBOT X30" in a browser's User-Agent don't match.
 */
const CRAWLER =
  /(?:bot|crawler|spider)[/;]|\b(?:baiduspider|bytespider|facebookexternalhit|facebookcatalog|meta-externalagent|meta-externalfetcher|telegrambot|whatsapp|ia_archiver|google-inspectiontool|google-extended|googleother|storebot-google|mediapartners-google|adsbot-google|feedfetcher-google|chatgpt-user|perplexity-user|anthropic-ai|claude-web|cohere-ai|diffbot|bingpreview|slurp)\b/i;

/** Scripts and headless browsers: fine for the API (people script it), but they don't need live data in HTML. */
const SCRIPTED = /\b(?:curl|wget|python-requests|python-urllib|aiohttp|httpx|go-http-client|okhttp|java|libwww-perl|scrapy|node-fetch|axios|undici|headlesschrome|phantomjs|lighthouse)\b/i;

/** Search-engine, AI and social crawlers. These may not use /api/v1 (robots.txt already disallows it). */
export function isCrawler(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && CRAWLER.test(userAgent));
}

/**
 * Anything that isn't a person in a browser: crawlers, scripts, headless browsers and requests with no
 * User-Agent. Result pages skip the live provider lookups for these and keep the title, metadata and explorer
 * links, which is all a link preview or crawler needs.
 */
export function isAutomated(userAgent: string | null | undefined): boolean {
  if (!userAgent?.trim()) return true;
  return CRAWLER.test(userAgent) || SCRIPTED.test(userAgent);
}
