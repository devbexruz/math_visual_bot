import type { ShapeData } from '../components/Workspace3D';
import type { Shape2DData } from '../components/Workspace2D';

export interface World {
  id: string;
  name: string;
  type: '2D' | '3D';
  shapes: ShapeData[];
  shapes2D: Shape2DData[];
  createdAt: number;
  prompt?: string;
}

const STORAGE_KEY = 'math_visual_bot_worlds';

export function loadWorlds(): World[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return [];
}

export function saveWorlds(worlds: World[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
}

export function getWorldById(id: string): World | undefined {
  return loadWorlds().find(w => w.id === id);
}

export function updateWorldShapes(id: string, shapes: ShapeData[]): void {
  const worlds = loadWorlds();
  const idx = worlds.findIndex(w => w.id === id);
  if (idx !== -1) {
    worlds[idx].shapes = shapes;
    saveWorlds(worlds);
  }
}

export function updateWorldShapes2D(id: string, shapes2D: Shape2DData[]): void {
  const worlds = loadWorlds();
  const idx = worlds.findIndex(w => w.id === id);
  if (idx !== -1) {
    worlds[idx].shapes2D = shapes2D;
    saveWorlds(worlds);
  }
}

export function deleteWorld(id: string): void {
  const worlds = loadWorlds().filter(w => w.id !== id);
  saveWorlds(worlds);
}
