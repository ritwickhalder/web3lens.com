import { SITE } from '@/config/site';

/** OpenSearch descriptor so browsers can offer "Search Web3Lens" from the address bar. */
export const dynamic = 'force-static';

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>${SITE.name}</ShortName>
  <Description>Search addresses, transactions, blocks and names on any blockchain</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/svg+xml">${SITE.url}/icon.svg</Image>
  <Url type="text/html" method="get" template="${SITE.url}/search?q={searchTerms}"/>
  <Url type="application/opensearchdescription+xml" rel="self" template="${SITE.url}/opensearch.xml"/>
  <moz:SearchForm>${SITE.url}/</moz:SearchForm>
</OpenSearchDescription>
`;
  return new Response(xml, {
    headers: { 'content-type': 'application/opensearchdescription+xml; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
}
