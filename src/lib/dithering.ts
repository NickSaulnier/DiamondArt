import RgbQuant from 'rgbquant';

export type DitherKernel =
  | 'FloydSteinberg'
  | 'FalseFloydSteinberg'
  | 'Stucki'
  | 'Atkinson'
  | 'Jarvis'
  | 'Burkes'
  | 'Sierra'
  | 'TwoSierra'
  | 'SierraLite';

export interface RgbQuantOptions {
  colors: number;
  method?: 1 | 2;
  boxSize?: [number, number];
  boxPxls?: number;
  initColors?: number;
  minHueCols?: number;
  dithKern: DitherKernel | null;
  dithDelta?: number;
  dithSerp?: boolean;
  palette?: [number, number, number][];
  useCache?: boolean;
  cacheFreq?: number;
  colorDist?: 'euclidean' | 'manhattan';
}

export type DitherMode = 'Error Diffusion' | 'Bayer';

export type RGBTriplet = [number, number, number];

/**
 * Build palette from image using RgbQuant (sample + palette).
 */
export function buildPalette(
  image: HTMLImageElement | HTMLCanvasElement,
  options: RgbQuantOptions
): RGBTriplet[] {
  const q = new RgbQuant({
    colors: options.colors,
    method: options.method ?? 2,
    boxSize: options.boxSize ?? [64, 64],
    boxPxls: options.boxPxls ?? 2,
    initColors: options.initColors ?? 4096,
    minHueCols: options.minHueCols ?? 0,
    dithKern: null,
    palette: options.palette ?? [],
    useCache: options.useCache !== false,
    cacheFreq: options.cacheFreq ?? 10,
    colorDist: options.colorDist ?? 'euclidean',
  });
  q.sample(image);
  const pal = q.palette(true);
  return pal as RGBTriplet[];
}

/**
 * Dither image using RgbQuant (error diffusion). Draws to an offscreen canvas and returns it with palette.
 */
export function ditherWithRgbQuant(
  image: HTMLImageElement | HTMLCanvasElement,
  options: RgbQuantOptions,
  width: number,
  height: number,
  blockSize: number
): { canvas: HTMLCanvasElement; palette: RGBTriplet[] } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context');
  ctx.drawImage(image, 0, 0, width, height);

  const q = new RgbQuant({
    colors: options.colors,
    method: options.method ?? 2,
    boxSize: options.boxSize ?? [64, 64],
    boxPxls: options.boxPxls ?? 2,
    initColors: options.initColors ?? 4096,
    minHueCols: options.minHueCols ?? 0,
    dithKern: options.dithKern ?? 'FloydSteinberg',
    dithSerp: options.dithSerp ?? false,
    palette: options.palette ?? [],
    useCache: options.useCache !== false,
    cacheFreq: options.cacheFreq ?? 10,
    colorDist: options.colorDist ?? 'euclidean',
  });
  q.sample(image);
  const palette = q.palette(true) as RGBTriplet[];
  const result = q.reduce(
    canvas,
    1,
    options.dithKern ?? 'FloydSteinberg',
    options.dithSerp
  ) as Uint8Array;

  const imageData = ctx.getImageData(0, 0, width, height);
  imageData.data.set(result);
  ctx.putImageData(imageData, 0, 0);

  if (blockSize > 1) {
    addPixelation(ctx, canvas, width, height, blockSize);
  }

  return { canvas, palette };
}

/**
 * Get closest palette color by Euclidean distance (for Bayer dither).
 */
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

/**
 * Downscale then upscale with imageSmoothing disabled for blocky "bead" effect.
 */
export function addPixelation(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  blockSize: number
): void {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  tempCanvas.width = width / blockSize;
  tempCanvas.height = height / blockSize;

  tempCtx.imageSmoothingEnabled = false;
  const tempCtxAny = tempCtx as unknown as Record<string, boolean>;
  tempCtxAny.msImageSmoothingEnabled = false;
  tempCtxAny.mozImageSmoothingEnabled = false;
  tempCtxAny.webkitImageSmoothingEnabled = false;
  tempCtx.drawImage(sourceCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

  ctx.imageSmoothingEnabled = false;
  const ctxAny = ctx as unknown as Record<string, boolean>;
  ctxAny.msImageSmoothingEnabled = false;
  ctxAny.mozImageSmoothingEnabled = false;
  ctxAny.webkitImageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, width, height);
}

const BAYER_THRESHOLD_MAP: number[][] = [
  [15, 135, 45, 165],
  [195, 75, 225, 105],
  [60, 180, 30, 150],
  [240, 120, 210, 90],
];

/**
 * Apply Bayer matrix dither to imageData in-place, then optionally pixelate.
 */
export function bayerDither(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  palette: RGBTriplet[],
  blockSize: number
): void {
  const data = imageData.data;
  const w = imageData.width;
  const newPalette: Array<[number, number, number, number]> = palette.map((color, id) => [
    id,
    color[0],
    color[1],
    color[2],
  ]);

  for (let currentPixel = 0; currentPixel <= data.length - 4; currentPixel += 4) {
    const x = (currentPixel / 4) % w;
    const y = Math.floor(currentPixel / 4 / w);
    const t = BAYER_THRESHOLD_MAP[x % 4][y % 4];
    const map = Math.floor((data[currentPixel] + t) / 2);
    const map2 = Math.floor((data[currentPixel + 1] + t) / 2);
    const map3 = Math.floor((data[currentPixel + 2] + t) / 2);
    const closest = getClosestColor(
      newPalette.map(([, r, g, b]) => [r, g, b]),
      [map, map2, map3]
    );
    data[currentPixel] = closest[0];
    data[currentPixel + 1] = closest[1];
    data[currentPixel + 2] = closest[2];
  }

  ctx.putImageData(imageData, 0, 0);

  if (blockSize > 1 && ctx.canvas) {
    addPixelation(ctx, ctx.canvas, imageData.width, imageData.height, blockSize);
  }
}

/**
 * Run dither: either RgbQuant error diffusion or Bayer, writing result to the given canvas.
 */
export function dither(
  mode: DitherMode,
  image: HTMLImageElement | HTMLCanvasElement,
  options: RgbQuantOptions,
  width: number,
  height: number,
  blockSize: number,
  palette: RGBTriplet[]
): { canvas: HTMLCanvasElement; palette: RGBTriplet[] } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context');
  ctx.drawImage(image, 0, 0, width, height);

  if (mode === 'Bayer') {
    const imageData = ctx.getImageData(0, 0, width, height);
    bayerDither(ctx, imageData, palette, blockSize);
    return { canvas, palette };
  }

  const result = ditherWithRgbQuant(image, options, width, height, blockSize);
  return { canvas: result.canvas, palette: result.palette };
}
