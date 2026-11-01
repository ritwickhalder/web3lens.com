import Link from 'next/link';
import { PageShell } from '@/components/content/PageShell';

export default function NotFound() {
  return (
    <PageShell title="PAGE NOT FOUND">
      <p className="text-lg text-white">
        That page doesn't exist.{' '}
        <Link href="/" className="font-bold underline">
          Go back to the search
        </Link>
      </p>
    </PageShell>
  );
}
