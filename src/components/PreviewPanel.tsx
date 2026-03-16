import { useState, useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DitheringOverlay } from './DitheringOverlay';

const DISPLAY_CELL_SIZE_MIN = 4;
const DISPLAY_CELL_SIZE_MAX = 32;

export interface PreviewViewState {
  viewportWidth: number;
  viewportHeight: number;
  panX: number;
  panY: number;
}

interface PreviewPanelProps {
  sourceUrl: string | null;
  ditheredUrl: string | null;
  width: number;
  height: number;
  blockSize: number;
  displayCellSize: number;
  onDisplayCellSizeChange: (value: number) => void;
  viewOriginal: boolean;
  onToggleView: () => void;
  isDithering?: boolean;
  previewViewRef?: React.MutableRefObject<PreviewViewState | null>;
}

function clampPan(pan: number, viewportSize: number, contentSize: number): number {
  const min = Math.min(0, viewportSize - contentSize);
  const max = Math.max(0, viewportSize - contentSize);
  return Math.min(max, Math.max(min, pan));
}

export function PreviewPanel({
  sourceUrl,
  ditheredUrl,
  width,
  height,
  blockSize,
  displayCellSize,
  onDisplayCellSizeChange,
  viewOriginal,
  onToggleView,
  isDithering = false,
  previewViewRef,
}: PreviewPanelProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);

  const showDithered = ditheredUrl != null;
  const displayUrl = viewOriginal ? sourceUrl : (ditheredUrl ?? sourceUrl);

  const scale =
    !viewOriginal && blockSize > 0 && displayCellSize > 0
      ? displayCellSize / blockSize
      : 1;
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [displayUrl, displayWidth, displayHeight]);

  useEffect(() => {
    if (!previewViewRef || !ditheredUrl) return;
    previewViewRef.current = {
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
      panX: pan.x,
      panY: pan.y,
    };
  }, [previewViewRef, ditheredUrl, viewportSize.width, viewportSize.height, pan.x, pan.y]);

  const clampPanToBounds = useCallback(
    (x: number, y: number) => ({
      x: clampPan(x, viewportSize.width, displayWidth),
      y: clampPan(y, viewportSize.height, displayHeight),
    }),
    [viewportSize.width, viewportSize.height, displayWidth, displayHeight]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!displayUrl || isDithering) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [displayUrl, isDithering, pan.x, pan.y]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStartRef.current) return;
      const { clientX, clientY, panX, panY } = dragStartRef.current;
      const next = clampPanToBounds(panX + e.clientX - clientX, panY + e.clientY - clientY);
      setPan(next);
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: next.x, panY: next.y };
    },
    [clampPanToBounds]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const { clientX, clientY, panX, panY } = dragStartRef.current;
      const next = clampPanToBounds(panX + e.clientX - clientX, panY + e.clientY - clientY);
      setPan(next);
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: next.x, panY: next.y };
    };
    const onUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, clampPanToBounds]);

  const canPan = displayUrl && (displayWidth > viewportSize.width || displayHeight > viewportSize.height);
  const cursor = isDragging ? 'grabbing' : canPan ? 'grab' : 'default';

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (!displayUrl || isDithering) return;
      e.preventDefault();
      const step = e.deltaY > 0 ? -1 : 1;
      const next = Math.max(
        DISPLAY_CELL_SIZE_MIN,
        Math.min(DISPLAY_CELL_SIZE_MAX, displayCellSize + step)
      );
      if (next !== displayCellSize) onDisplayCellSizeChange(next);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [displayUrl, isDithering, displayCellSize, onDisplayCellSizeChange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0 }}>
      {showDithered && !isDithering && (
        <button
          type="button"
          onClick={onToggleView}
          className="text-left text-sm underline hover:no-underline text-gray-700"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {viewOriginal ? 'Show dithered' : 'Show original'}
        </button>
      )}
      <Box
        sx={{
          position: 'relative',
          border: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#fafafa',
          flex: 1,
          minHeight: 0,
          p: 3,
          overflow: 'hidden',
        }}
      >
        <DitheringOverlay visible={isDithering} />
        <Box
          ref={viewportRef}
          sx={{
            position: 'absolute',
            inset: 24,
            overflow: 'hidden',
            cursor,
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {displayUrl ? (
            <Box
              component="span"
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                display: 'block',
                width: displayWidth || 0,
                height: displayHeight || 0,
              }}
            >
              <img
                src={displayUrl}
                alt={viewOriginal ? 'Original' : 'Dithered'}
                draggable={false}
                style={{
                  imageRendering: 'pixelated',
                  width: displayWidth || undefined,
                  height: displayHeight || undefined,
                  display: 'block',
                  pointerEvents: 'none',
                }}
                width={width}
                height={height}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Preview will appear here
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
