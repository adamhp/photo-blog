import type { Photo } from './photos';

export type Tile = {
  photo: Photo;
  x: number;
  y: number;
  width: number;
  imageHeight: number;
  span: 1 | 2;
};

export type BentoLayout = { tiles: Tile[]; height: number };

type Options = {
  columns: number;
  containerWidth: number;
  gap: number;
  captionHeight: number;
};

// Landscape tiles span two columns. To keep the two columns level under a
// span, the last tile of the shorter column is made taller (its image is
// cropped via object-cover) by at most this fraction of its image height.
const MAX_STRETCH = 0.25;

// A landscape photo that cannot span without a large stretch waits for the
// columns to line up, letting at most this many later photos go first.
const MAX_DELAY = 4;

type Column = { bottom: number; last: Tile | null };

export function layoutBento(photos: Photo[], opts: Options): BentoLayout {
  const { columns: count, containerWidth, gap, captionHeight } = opts;
  const colWidth = (containerWidth - gap * (count - 1)) / count;
  const columns: Column[] = Array.from({ length: count }, () => ({ bottom: 0, last: null }));
  const tiles: Tile[] = [];

  const place = (photo: Photo, start: number, span: 1 | 2, top: number) => {
    const width = span * colWidth + (span - 1) * gap;
    const tile: Tile = {
      photo,
      x: start * (colWidth + gap),
      y: top,
      width,
      imageHeight: width / photo.aspectRatio,
      span,
    };
    tiles.push(tile);
    for (let i = start; i < start + span; i++) {
      columns[i]!.bottom = top + tile.imageHeight + captionHeight + gap;
      columns[i]!.last = tile;
    }
  };

  const placeSingle = (photo: Photo) => {
    let best = 0;
    columns.forEach((c, i) => {
      if (c.bottom < columns[best]!.bottom) best = i;
    });
    place(photo, best, 1, columns[best]!.bottom);
  };

  // A tile can only grow if no later tile sits below it in any column it covers.
  const stretchable = (col: Column): Tile | null => {
    const tile = col.last;
    if (!tile) return null;
    const covered = columns.filter((c) => c.last === tile).length;
    return covered === tile.span ? tile : null;
  };

  // Returns false when no adjacent pair is level enough (unless forced).
  const placeSpan = (photo: Photo, force: boolean): boolean => {
    let best = -1;
    let bestTop = Infinity;
    for (let i = 0; i < count - 1; i++) {
      const a = columns[i]!;
      const b = columns[i + 1]!;
      const top = Math.max(a.bottom, b.bottom);
      const shorter = a.bottom < b.bottom ? a : b;
      const diff = top - shorter.bottom;
      const tile = stretchable(shorter);
      const fits = diff === 0 || (tile !== null && diff <= tile.imageHeight * MAX_STRETCH);
      if ((fits || force) && top < bestTop) {
        best = i;
        bestTop = top;
      }
    }
    if (best < 0) return false;

    for (const col of [columns[best]!, columns[best + 1]!]) {
      const diff = bestTop - col.bottom;
      // Stretch the shorter column's last tile; a forced placement may leave a small gap.
      const tile = stretchable(col);
      if (diff > 0 && tile) {
        const stretch = Math.min(diff, tile.imageHeight * MAX_STRETCH);
        tile.imageHeight += stretch;
        for (const c of columns) if (c.last === tile) c.bottom += stretch;
      }
    }
    place(photo, best, 2, bestTop);
    return true;
  };

  const pending: { photo: Photo; index: number }[] = [];
  const flushPending = () => {
    while (pending.length > 0 && placeSpan(pending[0]!.photo, false)) pending.shift();
  };

  photos.forEach((photo, index) => {
    if (pending.length > 0 && index - pending[0]!.index > MAX_DELAY) {
      placeSpan(pending.shift()!.photo, true);
      flushPending();
    }
    const isLandscape = count > 1 && photo.aspectRatio > 1;
    if (!isLandscape) {
      placeSingle(photo);
      flushPending();
    } else if (pending.length > 0 || !placeSpan(photo, false)) {
      pending.push({ photo, index });
    }
  });
  for (const { photo } of pending) placeSpan(photo, true);

  const height = Math.max(0, ...columns.map((c) => c.bottom - gap));
  return { tiles, height };
}
