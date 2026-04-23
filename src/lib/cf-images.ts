export type Variant = 'thumb' | 'medium' | 'full';

const ACCOUNT_HASH = import.meta.env.VITE_CF_ACCOUNT_HASH;

export function cfImageUrl(cfImageId: string, variant: Variant): string {
  if (!ACCOUNT_HASH) {
    throw new Error('VITE_CF_ACCOUNT_HASH is not set — images cannot be built');
  }
  return `https://imagedelivery.net/${ACCOUNT_HASH}/${cfImageId}/${variant}`;
}
