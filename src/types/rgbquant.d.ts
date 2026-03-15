declare module 'rgbquant' {
  export interface RgbQuantOptions {
    colors?: number;
    method?: 1 | 2;
    boxSize?: [number, number];
    boxPxls?: number;
    initColors?: number;
    minHueCols?: number;
    dithKern?: string | null;
    dithDelta?: number;
    dithSerp?: boolean;
    palette?: [number, number, number][];
    reIndex?: boolean;
    useCache?: boolean;
    cacheFreq?: number;
    colorDist?: 'euclidean' | 'manhattan';
  }

  export default class RgbQuant {
    constructor(opts?: RgbQuantOptions);
    sample(img: HTMLImageElement | HTMLCanvasElement | ImageData, width?: number): void;
    palette(tuples?: boolean, noSort?: boolean): [number, number, number][] | Uint8Array;
    reduce(
      img: HTMLImageElement | HTMLCanvasElement | ImageData,
      retType?: 1 | 2,
      dithKern?: string | null,
      dithSerp?: boolean
    ): Uint8Array | number[];
  }
}
