import { PostCard } from '@/components/blog/PostCard';
import { getCategory } from '@/config/blog';
import type { PostSummary } from '@/lib/blog/posts';

export const searchText = (p: PostSummary) => [p.title, p.description, getCategory(p.category)?.name, ...p.tags].join(' ').toLowerCase();

/** Grid of article cards; each item carries the text BlogSearch filters on. */
export function PostList({ posts, id, numbered }: { posts: PostSummary[]; id: string; numbered?: Map<string, number> }) {
  return (
    <ul id={id} data-filter={id} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {posts.map((p) => (
        <li key={p.slug} data-search={searchText(p)}>
          <PostCard post={p} index={numbered?.get(p.slug)} />
        </li>
      ))}
    </ul>
  );
}
