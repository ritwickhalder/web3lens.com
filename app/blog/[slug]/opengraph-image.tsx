import { ImageResponse } from 'next/og';
import { getCategory } from '@/config/blog';
import { SITE } from '@/config/site';
import { getAllPosts, getPost } from '@/lib/blog/posts';

export const alt = 'Web3Lens blog article';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

const GRID = 'rgba(79,209,255,0.08)';

/** Per-article social image: category, headline and reading time on the site's blueprint background. */
export default async function PostImage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  const title = post?.title ?? 'Web3Lens Blog';
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 24, color: '#4fd1ff', letterSpacing: 3 }}>
          <span>WEB3LENS BLOG</span>
          <span>{(post ? getCategory(post.category)?.name : '')?.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 70 ? 60 : 72, fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#8fa6bc', borderTop: '2px solid #2d5273', paddingTop: 24 }}>
          <span>{post ? `${post.readingMinutes} min read · ${post.author.name}` : ''}</span>
          <span>{SITE.domain}</span>
        </div>
      </div>
    ),
    size,
  );
}
