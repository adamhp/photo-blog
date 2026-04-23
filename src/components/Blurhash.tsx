import { useEffect, useRef } from 'react';
import { decode } from 'blurhash';

type Props = {
  hash: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Decodes a blurhash into a 32x32 canvas. Scaled up via CSS.
 */
export function Blurhash({ hash, width = 32, height = 32, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    try {
      const pixels = decode(hash, width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Invalid hash — leave canvas blank; parent shows solid bg
    }
  }, [hash, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
