import { useState, useCallback, useRef, useEffect } from 'react';
import { buildPalette, addPixelation, type RgbQuantOptions, type DitherMode, type RGBTriplet } from '../lib/dithering';
import type { WorkerRgbQuantOptions, DitherPayload, DitherResult } from '../dither.worker';

export interface UseDitherState {
  sourceImage: HTMLImageElement | null;
  sourceUrl: string | null;
  palette: RGBTriplet[];
  ditheredCanvas: HTMLCanvasElement | null;
  ditheredUrl: string | null;
  width: number;
  height: number;
  error: string | null;
  isAnalyzing: boolean;
  isDithering: boolean;
}

const defaultState: UseDitherState = {
  sourceImage: null,
  sourceUrl: null,
  palette: [],
  ditheredCanvas: null,
  ditheredUrl: null,
  width: 0,
  height: 0,
  error: null,
  isAnalyzing: false,
  isDithering: false,
};

function toWorkerOptions(opts: RgbQuantOptions): WorkerRgbQuantOptions {
  return {
    colors: opts.colors,
    method: opts.method,
    boxSize: opts.boxSize,
    boxPxls: opts.boxPxls,
    initColors: opts.initColors,
    minHueCols: opts.minHueCols,
    dithKern: opts.dithKern != null ? opts.dithKern : null,
    dithDelta: opts.dithDelta,
    dithSerp: opts.dithSerp,
    palette: opts.palette,
    useCache: opts.useCache,
    cacheFreq: opts.cacheFreq,
    colorDist: opts.colorDist,
  };
}

export function useDither() {
  const [state, setState] = useState<UseDitherState>(defaultState);
  const revokeRef = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const runDitherAbortedRef = useRef<boolean>(false);

  const setSourceImage = useCallback((image: HTMLImageElement | null, objectUrl: string | null) => {
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current);
      revokeRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      sourceImage: image,
      sourceUrl: objectUrl,
      palette: [],
      ditheredCanvas: null,
      ditheredUrl: null,
      width: image?.naturalWidth ?? 0,
      height: image?.naturalHeight ?? 0,
      error: null,
    }));
  }, []);

  const analyzePalette = useCallback(
    (options: RgbQuantOptions) => {
      const { sourceImage } = state;
      if (!sourceImage) {
        setState((prev) => ({ ...prev, error: 'No image loaded' }));
        return;
      }
      setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));
      try {
        const palette = buildPalette(sourceImage, options);
        setState((prev) => ({ ...prev, palette, isAnalyzing: false }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: err instanceof Error ? err.message : 'Failed to analyze palette',
        }));
      }
    },
    [state]
  );

  const runDither = useCallback(
    (options: RgbQuantOptions, mode: DitherMode, blockSize: number, maxWidth?: number) => {
      const { sourceImage, width: naturalWidth, height: naturalHeight, palette: currentPalette } =
        state;
      if (!sourceImage) {
        setState((prev) => ({ ...prev, error: 'No image loaded' }));
        return;
      }
      setState((prev) => ({ ...prev, isDithering: true, error: null }));
      runDitherAbortedRef.current = false;
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }

      let w = naturalWidth;
      let h = naturalHeight;
      if (maxWidth != null && maxWidth > 0 && naturalWidth > maxWidth) {
        w = maxWidth;
        h = Math.round((naturalHeight / naturalWidth) * maxWidth);
      }

      const applyWorkerResult = (payload: DitherResult) => {
        if (runDitherAbortedRef.current) return;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = payload.width;
          canvas.height = payload.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas 2d context');
          const imageData = new ImageData(
            new Uint8ClampedArray(payload.resultBuffer),
            payload.width,
            payload.height
          );
          ctx.putImageData(imageData, 0, 0);
          if (payload.blockSize > 1) {
            addPixelation(ctx, canvas, payload.width, payload.height, payload.blockSize);
          }
          const url = canvas.toDataURL('image/png');
          setState((prev) => ({
            ...prev,
            ditheredCanvas: canvas,
            ditheredUrl: url,
            palette: payload.palette,
            width: payload.width,
            height: payload.height,
            isDithering: false,
          }));
        } catch (err) {
          setState((prev) => ({
            ...prev,
            isDithering: false,
            error: err instanceof Error ? err.message : 'Failed to apply result',
          }));
        }
      };

      const tryWorker = () => {
        try {
          if (!workerRef.current) {
            workerRef.current = new Worker(
              new URL('../dither.worker.ts', import.meta.url)
            );
            workerRef.current.onmessage = (
              e: MessageEvent<{ type: string; payload?: DitherResult; error?: string }>
            ) => {
              if (e.data?.type === 'result' && e.data.payload) {
                applyWorkerResult(e.data.payload);
              } else if (e.data?.type === 'error') {
                setState((prev) => ({
                  ...prev,
                  isDithering: false,
                  error: e.data.error ?? 'Dithering failed in worker',
                }));
              }
            };
            workerRef.current.onerror = () => {
              setState((prev) => ({
                ...prev,
                isDithering: false,
                error: 'Dithering worker error',
              }));
            };
          }
          const offscreen = document.createElement('canvas');
          offscreen.width = w;
          offscreen.height = h;
          const ctx = offscreen.getContext('2d');
          if (!ctx) {
            setState((prev) => ({
              ...prev,
              isDithering: false,
              error: 'Could not get canvas 2d context',
            }));
            return;
          }
          const imgSource = sourceImage as unknown as CanvasImageSource;
          ctx.drawImage(imgSource, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const payload: DitherPayload = {
            imageBuffer: imageData.data.buffer,
            width: w,
            height: h,
            options: toWorkerOptions(options),
            mode,
            blockSize,
            palette: currentPalette.length > 0 ? currentPalette : null,
          };
          workerRef.current.postMessage({ type: 'dither', payload }, [imageData.data.buffer]);
        } catch (err) {
          setState((prev) => ({
            ...prev,
            isDithering: false,
            error: err instanceof Error ? err.message : 'Failed to start dithering worker',
          }));
        }
      };

      // Yield so loading overlay can paint, then run in worker
      setTimeout(tryWorker, 32);
    },
    [state]
  );

  useEffect(() => {
    return () => {
      runDitherAbortedRef.current = true;
    };
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const setError = useCallback((message: string) => {
    setState((prev) => ({ ...prev, error: message }));
  }, []);

  return {
    ...state,
    setSourceImage,
    analyzePalette,
    runDither,
    clearError,
    setError,
  };
}
