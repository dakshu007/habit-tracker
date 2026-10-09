import { Directory, File, Paths } from 'expo-file-system';

import type { RunPoint } from '@/data/types';

export interface RouteData {
  points: RunPoint[];
  gaps: number[];
}

/**
 * Each run's GPS route lives in its own file (documents/runs/<id>.json), so the
 * run list stays small no matter how many runs pile up — AsyncStorage rows on
 * Android can't hold more than ~2 MB.
 */
const dir = () => new Directory(Paths.document, 'runs');
const fileFor = (id: string) => new File(Paths.document, 'runs', `${id}.json`);

export function saveRoute(id: string, route: RouteData) {
  const d = dir();
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  const f = fileFor(id);
  f.create({ overwrite: true });
  f.write(JSON.stringify({ points: route.points, gaps: route.gaps }));
}

export async function loadRoute(id: string): Promise<RouteData | null> {
  try {
    const f = fileFor(id);
    if (!f.exists) return null;
    const data = JSON.parse(await f.text()) as Partial<RouteData>;
    return { points: Array.isArray(data.points) ? data.points : [], gaps: Array.isArray(data.gaps) ? data.gaps : [] };
  } catch {
    return null;
  }
}

export function deleteRoute(id: string) {
  try {
    const f = fileFor(id);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}
