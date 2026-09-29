import { Link } from 'wouter';
import { Search, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta('Page not found');

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Error 404</p>
        <h1 className="mt-4 font-serif text-5xl font-bold tracking-tight md:text-6xl">
          This table's empty.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We couldn't find the page you were looking for. It may have moved, or the link might be off by a letter.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2 rounded-xl">
            <Link href="/explore">
              <Search className="h-4 w-4" /> Explore the directory
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 rounded-xl">
            <Link href="/spin">
              <Shuffle className="h-4 w-4" /> Spin for a spot
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
