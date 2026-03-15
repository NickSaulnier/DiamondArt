import { useState, useCallback, useRef } from 'react';
import {
  buildPalette,
  dither,
  type RgbQuantOptions,
  type DitherMode,
  type RGBTriplet,
} from '../lib/dithering';

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

export function useDither() {
  const [state, setState] = useState<UseDitherState>(defaultState);
  const revokeRef = useRef<string | null>(null);

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
      const { sourceImage, width: naturalWidth, height: naturalHeight } = state;
      if (!sourceImage) {
        setState((prev) => ({ ...prev, error: 'No image loaded' }));
        return;
      }
      setState((prev) => ({ ...prev, isDithering: true, error: null }));
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
      try {
        let w = naturalWidth;
        let h = naturalHeight;
        if (maxWidth != null && maxWidth > 0 && naturalWidth > maxWidth) {
          w = maxWidth;
          h = Math.round((naturalHeight / naturalWidth) * maxWidth);
        }
        const palette =
          state.palette.length > 0 ? state.palette : buildPalette(sourceImage, options);
        const { canvas, palette: outPalette } = dither(
          mode,
          sourceImage,
          options,
          w,
          h,
          blockSize,
          palette
        );
        const url = canvas.toDataURL('image/png');
        setState((prev) => ({
          ...prev,
          ditheredCanvas: canvas,
          ditheredUrl: url,
          palette: outPalette,
          width: w,
          height: h,
          isDithering: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isDithering: false,
          error: err instanceof Error ? err.message : 'Dithering failed',
        }));
      }
    },
    [state]
  );

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
