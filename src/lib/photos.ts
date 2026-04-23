import rawManifest from '@/data/photos.json';

export type Exif = {
  camera?: string;
  lens?: string;
  focalLength?: number;
  focalLength35?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  exposureComp?: number;
  filmSimulation?: string;
};

export type Photo = {
  id: string;
  cfImageId: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurhash: string;
  takenAt: string;
  exif: Exif;
  tags?: string[];
};

export type PhotoManifest = {
  generatedAt: string;
  photos: Photo[];
};

export const manifest: PhotoManifest = rawManifest as PhotoManifest;

export function getPhotoById(id: string): Photo | undefined {
  return manifest.photos.find((p) => p.id === id);
}
