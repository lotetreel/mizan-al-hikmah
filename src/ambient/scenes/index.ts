import type { SceneDef } from '../types';
import { sidrah } from './sidrah';
import { desertNight } from './desertNight';
import { girih } from './girih';
import { fajr } from './fajr';
import { lanterns } from './lanterns';
import { moonlitSea } from './moonlitSea';

/** In the order they appear when scenes rotate automatically. */
export const SCENES: SceneDef[] = [sidrah, desertNight, girih, fajr, lanterns, moonlitSea];

export function sceneById(id: string): SceneDef | undefined {
    return SCENES.find(scene => scene.id === id);
}
