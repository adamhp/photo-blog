import type { Exif, Photo } from './photos';

export function formatAperture(f?: number): string | undefined {
  if (f === undefined) return undefined;
  const s = Number.isInteger(f) ? f.toFixed(0) : f.toFixed(1);
  return `ƒ/${s}`;
}

export function formatShutter(s?: string): string | undefined {
  if (s === undefined || s.length === 0) return undefined;
  return `${s}s`;
}

export function formatIso(iso?: number): string | undefined {
  return iso === undefined ? undefined : `ISO ${iso}`;
}

export function formatFocalLength(actual?: number, eq35?: number): string | undefined {
  if (actual === undefined && eq35 === undefined) return undefined;
  if (actual !== undefined && eq35 !== undefined && actual !== eq35) {
    return `${Math.round(actual)}mm / ${Math.round(eq35)}mm`;
  }
  const value = actual ?? eq35;
  return value === undefined ? undefined : `${Math.round(value)}mm`;
}

export function formatExposureComp(ev?: number): string | undefined {
  if (ev === undefined || ev === 0) return undefined;
  const sign = ev > 0 ? '+' : '';
  const rounded = Math.abs(ev * 3) % 1 === 0 ? fractional(ev) : ev.toFixed(2);
  return `${sign}${rounded}ev`;
}

function fractional(ev: number): string {
  const thirds = Math.round(ev * 3);
  if (thirds % 3 === 0) return String(thirds / 3);
  return `${thirds}/3`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}·${m}·${day}`;
}

export function formatIndex(n: number): string {
  return `№${String(n + 1).padStart(3, '0')}`;
}

export function formatCaption(photo: Photo, index: number): string {
  const e = photo.exif;
  const parts: string[] = [formatIndex(index)];
  if (e.camera) parts.push(shortenCamera(e.camera));
  if (e.lens) parts.push(shortenLens(e.lens));
  const aperture = formatAperture(e.aperture);
  if (aperture) parts.push(aperture);
  const shutter = formatShutter(e.shutterSpeed);
  if (shutter) parts.push(shutter);
  const iso = formatIso(e.iso);
  if (iso) parts.push(iso);
  if (e.filmSimulation) parts.push(e.filmSimulation.toUpperCase());
  return parts.join(' · ');
}

function shortenCamera(name: string): string {
  return name
    .replace(/^FUJIFILM\s+/i, '')
    .replace(/^Apple\s*/i, '')
    .trim();
}

function shortenLens(name: string): string {
  const m = name.match(/^(XF|XC)(\d+)(?:mm)?/i);
  if (m) return `${m[1]!.toUpperCase()}${m[2]}`;
  return name;
}

export function buildExifRows(exif: Exif, takenAt: string): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  rows.push(['Date', formatDate(takenAt)]);
  if (exif.camera) rows.push(['Camera', exif.camera]);
  if (exif.lens) rows.push(['Lens', exif.lens]);
  const focal = formatFocalLength(exif.focalLength, exif.focalLength35);
  if (focal) rows.push(['Focal', focal]);
  const aperture = formatAperture(exif.aperture);
  if (aperture) rows.push(['Aperture', aperture]);
  const shutter = formatShutter(exif.shutterSpeed);
  if (shutter) rows.push(['Shutter', shutter]);
  const iso = formatIso(exif.iso);
  if (iso) rows.push(['ISO', iso]);
  const comp = formatExposureComp(exif.exposureComp);
  if (comp) rows.push(['Exp. comp', comp]);
  if (exif.filmSimulation) rows.push(['Film sim', exif.filmSimulation]);
  return rows;
}
