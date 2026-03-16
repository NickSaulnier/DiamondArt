import RgbQuant from 'rgbquant';
import { bayerDitherBuffer, type RGBTriplet } from './lib/ditherUtils';

export type DitherMode = 'Error Diffusion' | 'Bayer';

export interface WorkerRgbQuantOptions {
  colors: number;
  method?: 1 | 2;
  boxSize?: [number, number];
  boxPxls?: number;
  initColors?: number;
  minHueCols?: number;
  dithKern: string | null;
  dithDelta?: number;
  dithSerp?: boolean;
  palette?: [number, number, number][];
  useCache?: boolean;
  cacheFreq?: number;
  colorDist?: 'euclidean' | 'manhattan';
}

export interface DitherPayload {
  imageBuffer: ArrayBuffer;
  width: number;
  height: number;
  options: WorkerRgbQuantOptions;
  mode: DitherMode;
  blockSize: number;
  palette: RGBTriplet[] | null;
}

export interface DitherResult {
  resultBuffer: ArrayBuffer;
  palette: RGBTriplet[];
  width: number;
  height: number;
  blockSize: number;
}

function buildPaletteInWorker(
  imageData: ImageData,
  options: WorkerRgbQuantOptions
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
  q.sample(imageData);
  return q.palette(true) as RGBTriplet[];
}

self.onmessage = (e: MessageEvent<{ type: 'dither'; payload: DitherPayload }>) => {
  if (e.data?.type !== 'dither') return;
  const { imageBuffer, width, height, options, mode, blockSize, palette: inputPalette } =
    e.data.payload;

  const data = new Uint8ClampedArray(imageBuffer);
  const imageData = new ImageData(data, width, height);

  try {
    let palette: RGBTriplet[];
    let resultBuffer: ArrayBuffer;

    if (mode === 'Bayer') {
      palette =
        inputPalette && inputPalette.length > 0
          ? inputPalette
          : buildPaletteInWorker(imageData, options);
      bayerDitherBuffer(imageData, palette);
      resultBuffer = imageData.data.buffer.slice(0) as ArrayBuffer;
    } else {
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
      q.sample(imageData);
      palette = q.palette(true) as RGBTriplet[];
      const result = q.reduce(
        imageData,
        1,
        options.dithKern ?? 'FloydSteinberg',
        options.dithSerp
      ) as Uint8Array;
      resultBuffer = result.buffer.slice(0) as ArrayBuffer;
    }

    const response: DitherResult = {
      resultBuffer,
      palette,
      width,
      height,
      blockSize,
    };
    (self as unknown as { postMessage: (message: unknown, transfer: Transferable[]) => void }).postMessage(
      { type: 'result', payload: response },
      [resultBuffer as unknown as Transferable]
    );
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Dithering failed',
    });
  }
};
