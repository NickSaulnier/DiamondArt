export type RGBTriplet = [number, number, number];

export function getClosestColor(
  colors: Array<[number, number, number]>,
  [r2, g2, b2]: [number, number, number]
): [number, number, number] {
  let minDist = Infinity;
  let closest = colors[0];
  for (let i = 0; i < colors.length; i++) {
    const [r1, g1, b1] = colors[i];
    const dist = (r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2;
    if (dist < minDist) {
      minDist = dist;
      closest = colors[i];
    }
  }
  return closest;
}

export const BAYER_THRESHOLD_MAP: number[][] = [
  [15, 135, 45, 165],
  [195, 75, 225, 105],
  [60, 180, 30, 150],
  [240, 120, 210, 90],
];

/**
 * Apply Bayer matrix dither to ImageData in place (buffer-only, no canvas).
 * Used by the Web Worker.
 */
export function bayerDitherBuffer(
  imageData: ImageData,
  palette: RGBTriplet[]
): void {
  const data = imageData.data;
  const w = imageData.width;
  const paletteRgb = palette.map((c) => [c[0], c[1], c[2]] as [number, number, number]);

  for (let i = 0; i <= data.length - 4; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    const t = BAYER_THRESHOLD_MAP[x % 4][y % 4];
    const map = Math.floor((data[i] + t) / 2);
    const map2 = Math.floor((data[i + 1] + t) / 2);
    const map3 = Math.floor((data[i + 2] + t) / 2);
    const closest = getClosestColor(paletteRgb, [map, map2, map3]);
    data[i] = closest[0];
    data[i + 1] = closest[1];
    data[i + 2] = closest[2];
  }
}
