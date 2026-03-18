import { useState, useCallback, useRef, useEffect } from 'react';
import { buildPalette, addPixelation, type RgbQuantOptions, type DitherMode, type RGBTriplet } from '../lib/dithering';
import { DMC_PALETTE } from '../lib/dmcPalette';
import type { ColorEntry } from '../components/ColorKey';
import type { WorkerRgbQuantOptions, DitherPayload, DitherResult } from '../dither.worker';

export interface UseDitherState {
  sourceImage: HTMLImageElement | null;
  sourceUrl: string | null;
  // Distinct DMC colors used in the current pattern.
  colorEntries: ColorEntry[];
  ditheredCanvas: HTMLCanvasElement | null;
  ditheredUrl: string | null;
  width: number;
  height: number;
  error: string | null;
  isAnalyzing: boolean;
  isDithering: boolean;
  beadGrid: number[][] | null;
  beadCols: number;
  beadRows: number;
  blockSizeUsed: number;
}

const defaultState: UseDitherState = {
  sourceImage: null,
  sourceUrl: null,
  colorEntries: [],
  ditheredCanvas: null,
  ditheredUrl: null,
  width: 0,
  height: 0,
  error: null,
  isAnalyzing: false,
  isDithering: false,
  beadGrid: null,
  beadCols: 0,
  beadRows: 0,
  blockSizeUsed: 0,
};

function findNearestDmcIndex(color: RGBTriplet): number {
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  const [r2, g2, b2] = color;
  for (let i = 0; i < DMC_PALETTE.length; i += 1) {
    const [r1, g1, b1] = DMC_PALETTE[i].rgb;
    const dist = (r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}

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
      colorEntries: [],
      ditheredCanvas: null,
      ditheredUrl: null,
      width: image?.naturalWidth ?? 0,
      height: image?.naturalHeight ?? 0,
      error: null,
      beadGrid: null,
      beadCols: 0,
      beadRows: 0,
      blockSizeUsed: 0,
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
        // For analysis, we can still show the auto palette if needed later,
        // but for now just clear any previous error/analyzing flag.
        void buildPalette(sourceImage, options);
        setState((prev) => ({ ...prev, isAnalyzing: false }));
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
      const { sourceImage, width: naturalWidth, height: naturalHeight } =
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

          // Build bead grid from the pixelated canvas so exports can be driven from discrete cells,
          // and map each bead to the nearest DMC color.
          let beadGrid: number[][] | null = null;
          let beadCols = 0;
          let beadRows = 0;
          const beadBlockSize = payload.blockSize;
          if (beadBlockSize > 0) {
            beadCols = Math.floor(payload.width / beadBlockSize);
            beadRows = Math.floor(payload.height / beadBlockSize);
            if (beadCols > 0 && beadRows > 0) {
              const grid: number[][] = [];
              const sampled = ctx.getImageData(0, 0, payload.width, payload.height);
              for (let row = 0; row < beadRows; row += 1) {
                const rowArr: number[] = [];
                for (let col = 0; col < beadCols; col += 1) {
                  const sampleX = Math.min(
                    col * beadBlockSize + Math.floor(beadBlockSize / 2),
                    payload.width - 1
                  );
                  const sampleY = Math.min(
                    row * beadBlockSize + Math.floor(beadBlockSize / 2),
                    payload.height - 1
                  );
                  const idx = (sampleY * payload.width + sampleX) * 4;
                  const r = sampled.data[idx];
                  const g = sampled.data[idx + 1];
                  const b = sampled.data[idx + 2];
                  const dmcIndex = findNearestDmcIndex([r, g, b]);
                  rowArr.push(dmcIndex);
                }
                grid.push(rowArr);
              }
              beadGrid = grid;
            }
          }

          // Derive distinct DMC colors used by the bead grid and assign numeric IDs.
          const usedDmcIndices = new Set<number>();
          if (beadGrid) {
            for (const row of beadGrid) {
              for (const idx of row) {
                usedDmcIndices.add(idx);
              }
            }
          }
          const sortedIndices = Array.from(usedDmcIndices).sort((a, b) => a - b);
          const colorEntries = sortedIndices.map((dmcIndex, i) => ({
            id: i + 1,
            dmcIndex,
            dmc: DMC_PALETTE[dmcIndex],
          }));

          // Recolor the underlying canvas so each bead block uses its DMC RGB color.
          const blockSizeUsed = payload.blockSize;
          if (beadGrid && blockSizeUsed > 0) {
            ctx.clearRect(0, 0, payload.width, payload.height);
            for (let row = 0; row < beadRows; row += 1) {
              const rowArr = beadGrid[row];
              for (let col = 0; col < beadCols; col += 1) {
                const dmcIndex = rowArr[col] ?? 0;
                const dmc = DMC_PALETTE[dmcIndex] ?? DMC_PALETTE[0];
                const [r, g, b] = dmc.rgb;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(
                  col * blockSizeUsed,
                  row * blockSizeUsed,
                  blockSizeUsed,
                  blockSizeUsed
                );
              }
            }
          }

          // Crop the export canvas so its dimensions are an exact multiple of the bead grid.
          let exportCanvas: HTMLCanvasElement = canvas;
          let exportWidth = payload.width;
          let exportHeight = payload.height;
          if (beadGrid && blockSizeUsed > 0 && beadCols > 0 && beadRows > 0) {
            const cropWidth = beadCols * blockSizeUsed;
            const cropHeight = beadRows * blockSizeUsed;
            if (cropWidth > 0 && cropHeight > 0 &&
              (cropWidth !== exportWidth || cropHeight !== exportHeight)) {
              const cropped = document.createElement('canvas');
              cropped.width = cropWidth;
              cropped.height = cropHeight;
              const croppedCtx = cropped.getContext('2d');
              if (croppedCtx) {
                const src: CanvasImageSource = canvas as unknown as CanvasImageSource;
                croppedCtx.drawImage(
                  src,
                  0,
                  0,
                  cropWidth,
                  cropHeight,
                  0,
                  0,
                  cropWidth,
                  cropHeight
                );
                exportCanvas = cropped;
                exportWidth = cropWidth;
                exportHeight = cropHeight;
              }
            }
          }

          const url = exportCanvas.toDataURL('image/png');
          setState((prev) => ({
            ...prev,
            ditheredCanvas: exportCanvas,
            ditheredUrl: url,
            width: exportWidth,
            height: exportHeight,
            isDithering: false,
            beadGrid,
            beadCols,
            beadRows,
            blockSizeUsed: beadBlockSize,
            colorEntries,
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
            palette: null,
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

  const updateBeadCells = useCallback(
    (updates: Array<{ row: number; col: number; dmcIndex: number }>) => {
      if (updates.length === 0) return;
      setState((prev) => {
        if (!prev.beadGrid || prev.beadCols <= 0 || prev.beadRows <= 0 || prev.blockSizeUsed <= 0) {
          return prev;
        }
        const grid = prev.beadGrid.map((row) => [...row]);
        for (const u of updates) {
          if (u.row >= 0 && u.row < prev.beadRows && u.col >= 0 && u.col < prev.beadCols) {
            grid[u.row][u.col] = u.dmcIndex;
          }
        }
        const usedDmcIndices = new Set<number>();
        for (const row of grid) {
          for (const idx of row) {
            usedDmcIndices.add(idx);
          }
        }
        const sortedIndices = Array.from(usedDmcIndices).sort((a, b) => a - b);
        const colorEntries: ColorEntry[] = sortedIndices.map((dmcIndex, i) => ({
          id: i + 1,
          dmcIndex,
          dmc: DMC_PALETTE[dmcIndex],
        }));
        const w = prev.beadCols * prev.blockSizeUsed;
        const h = prev.beadRows * prev.blockSizeUsed;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return { ...prev, beadGrid: grid, colorEntries };
        for (let row = 0; row < prev.beadRows; row += 1) {
          const rowArr = grid[row];
          for (let col = 0; col < prev.beadCols; col += 1) {
            const dmcIndex = rowArr[col] ?? 0;
            const dmc = DMC_PALETTE[dmcIndex] ?? DMC_PALETTE[0];
            const [r, g, b] = dmc.rgb;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(
              col * prev.blockSizeUsed,
              row * prev.blockSizeUsed,
              prev.blockSizeUsed,
              prev.blockSizeUsed
            );
          }
        }
        const url = canvas.toDataURL('image/png');
        return {
          ...prev,
          beadGrid: grid,
          colorEntries,
          ditheredCanvas: canvas,
          ditheredUrl: url,
          width: w,
          height: h,
        };
      });
    },
    []
  );

  return {
    ...state,
    setSourceImage,
    analyzePalette,
    runDither,
    updateBeadCells,
    clearError,
    setError,
  };
}
