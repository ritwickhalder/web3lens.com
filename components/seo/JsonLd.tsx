/** Renders one or more schema.org objects as a JSON-LD script. Data is built from our own content, never user input. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const graph = Array.isArray(data) ? { '@context': 'https://schema.org', '@graph': data } : { '@context': 'https://schema.org', ...data };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }} />;
}
