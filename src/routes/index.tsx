import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { Gallery } from '@/components/Gallery';
import { FilterSidebar } from '@/components/FilterSidebar';
import { FilterDrawer } from '@/components/FilterDrawer';
import { ExpandedPhoto } from '@/components/ExpandedPhoto';
import { useSyncFiltersFromUrl } from '@/lib/use-sync-filters-from-url';

const focalBucketSchema = z.enum(['≤24mm', '35mm', '50mm', '85mm', '135mm+']);

export const searchSchema = z.object({
  camera: z.array(z.string()).optional(),
  lens: z.array(z.string()).optional(),
  focal: z.array(focalBucketSchema).optional(),
  film: z.array(z.string()).optional(),
  tag: z.array(z.string()).optional(),
  photo: z.string().optional(),
});

export type GallerySearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: GalleryPage,
});

function GalleryPage() {
  useSyncFiltersFromUrl();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-paper">
      <div className="max-w-384 mx-auto">
        <Header onOpenFilters={() => setDrawerOpen(true)} />
        <main className="flex flex-col lg:flex-row gap-8 px-6 pt-6 pb-16">
          <div className="flex-1 min-w-0">
            <Gallery />
          </div>
          <FilterSidebar />
        </main>
      </div>
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ExpandedPhoto />
    </div>
  );
}
