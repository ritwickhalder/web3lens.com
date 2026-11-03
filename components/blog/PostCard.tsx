import { ArrowRight, Clock } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { PostCover } from '@/components/blog/PostCover';
import { formatDate } from '@/components/blog/format';
import { getCategory } from '@/config/blog';
import type { PostSummary } from '@/lib/blog/posts';

/** Article card for listings and "related articles". */
export function PostCard({ post, index, headingLevel = 'h2', featured = false }: { post: PostSummary; index?: number; headingLevel?: 'h2' | 'h3'; featured?: boolean }) {
  const H = headingLevel;
  return (
    <article className={`group relative flex h-full flex-col rounded-2xl border border-line bg-ink-2 p-3 transition-colors hover:border-accent/60 ${featured ? 'lg:grid lg:grid-cols-2 lg:items-center lg:gap-8' : ''}`}>
      <PostCover icon={post.icon} category={post.category} coins={post.coins} index={index} size={featured ? 'hero' : 'card'} />
      <div className={`flex flex-1 flex-col px-2 pb-2 pt-4 ${featured ? 'lg:py-6 lg:pr-6' : ''}`}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-bold text-muted">
          <Link href={`/blog/category/${post.category}`} className="relative z-10 text-accent hover:underline">
            {getCategory(post.category)?.name}
          </Link>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className="flex items-center gap-1">
            <Clock aria-hidden weight="bold" className="size-3.5" />
            {post.readingMinutes} min read
          </span>
        </p>
        <H className={`mt-2.5 font-extrabold tracking-tight text-fg group-hover:text-accent ${featured ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}>
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:rounded-2xl">
            {post.title}
          </Link>
        </H>
        <p className={`mt-2 font-medium leading-relaxed text-muted ${featured ? 'text-base sm:text-lg' : 'line-clamp-3 text-[15px]'}`}>{post.description}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-bold text-fg group-hover:text-accent">
          Read article <ArrowRight aria-hidden weight="bold" className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  );
}
