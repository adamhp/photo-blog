import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { Gallery } from '@/components/Gallery';

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
  return (
    <div className="min-h-dvh bg-paper">
      <Header />
      <main className="flex flex-col lg:flex-row gap-6 px-6 pt-6 pb-16">
        <div className="flex-1 min-w-0">
          <Gallery />
        </div>
      </main>
    </div>
  );
}
