import { useState, useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import { DitheringOverlay } from './DitheringOverlay';
import { CanvasToolbar } from './CanvasToolbar';
import { BeadGridWebGL } from './BeadGridWebGL';
import type { ColorEntry } from './ColorKey';

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
  beadCols: number;
  beadRows: number;
  beadGrid: number[][] | null;
  colorEntries: ColorEntry[];
  displayCellSize: number;
  onDisplayCellSizeChange: (value: number) => void;
  viewOriginal: boolean;
  onToggleView: () => void;
  isDithering?: boolean;
  previewViewRef?: React.MutableRefObject<PreviewViewState | null>;
  onUpdateBeadCells?: (updates: Array<{ row: number; col: number; dmcIndex: number }>) => void;
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
  beadCols,
  beadRows,
  beadGrid,
  colorEntries,
  displayCellSize,
  onDisplayCellSizeChange,
  viewOriginal,
  onToggleView,
  isDithering = false,
  previewViewRef,
  onUpdateBeadCells,
}: PreviewPanelProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);
  const [showNumberKeys, setShowNumberKeys] = useState(true);
  const [isColoringMode, setIsColoringMode] = useState(false);
  const [brushSizeCells, setBrushSizeCells] = useState(1);
  const [selectedDmcIndex, setSelectedDmcIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const numbersCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const showDithered = ditheredUrl != null;
  const displayUrl = viewOriginal ? sourceUrl : (ditheredUrl ?? sourceUrl);

  // Base scale from source pixels to display pixels
  const baseScale =
    blockSize > 0 && displayCellSize > 0 ? displayCellSize / blockSize : 1;

  // Default display size derived from original dimensions
  let displayWidth = width * baseScale;
  let displayHeight = height * baseScale;

  // For dithered view, snap the display size exactly to the bead grid so that
  // each bead cell is a perfect `displayCellSize` square and the grid aligns.
  if (!viewOriginal && beadCols > 0 && beadRows > 0) {
    displayWidth = beadCols * displayCellSize;
    displayHeight = beadRows * displayCellSize;
  }

  // Actual on-screen bead cell size; for dithered view this will equal
  // `displayCellSize` in both directions.
  const beadCellSizeX = beadCols > 0 ? displayWidth / beadCols : 0;
  const beadCellSizeY = beadRows > 0 ? displayHeight / beadRows : 0;
  const showCellGrid =
    !viewOriginal && !!ditheredUrl && beadCellSizeX >= 2 && beadCellSizeY >= 2;

  useEffect(() => {
    const canvas = numbersCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = displayWidth || 0;
    canvas.height = displayHeight || 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showNumberKeys || !showCellGrid || !beadGrid || beadCols <= 0 || beadRows <= 0) {
      return;
    }

    const idByDmcIndex = new Map<number, number>();
    colorEntries.forEach(({ id, dmcIndex }) => {
      idByDmcIndex.set(dmcIndex, id);
    });

    const fontSize = Math.max(6, Math.min(10, beadCellSizeY * 0.45));
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let row = 0; row < beadRows; row += 1) {
      const rowArr = beadGrid[row];
      if (!rowArr) continue;
      for (let col = 0; col < beadCols; col += 1) {
        const dmcIndex = rowArr[col];
        if (dmcIndex == null) continue;
        const id = idByDmcIndex.get(dmcIndex);
        if (id == null) continue;
        const x = col * beadCellSizeX + beadCellSizeX / 2;
        const y = row * beadCellSizeY + 1;
        ctx.fillText(String(id), x, y);
      }
    }
  }, [showNumberKeys, showCellGrid, beadGrid, beadCols, beadRows, beadCellSizeX, beadCellSizeY, colorEntries, displayWidth, displayHeight]);

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
      if (!displayUrl || isDithering || isColoringMode) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [displayUrl, isDithering, isColoringMode, pan.x, pan.y]
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

  const canPan = displayUrl && !isColoringMode && (displayWidth > viewportSize.width || displayHeight > viewportSize.height);
  // In coloring mode, only the image overlay should hide the cursor.
  // The viewport should keep a normal pointer when you're not over the image.
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
      {showDithered && !viewOriginal && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignSelf: 'flex-start' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showGridLines}
                onChange={(_, checked) => setShowGridLines(checked)}
                size="small"
              />
            }
            label="Show grid lines"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={showNumberKeys}
                onChange={(_, checked) => setShowNumberKeys(checked)}
                size="small"
              />
            }
            label="Show number keys"
          />
        </Box>
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
          {showDithered && !viewOriginal && (
            <CanvasToolbar
              isColoringMode={isColoringMode}
              onColoringModeChange={setIsColoringMode}
              brushSizeCells={brushSizeCells}
              onBrushSizeChange={setBrushSizeCells}
              selectedDmcIndex={selectedDmcIndex}
              onSelectedDmcIndexChange={setSelectedDmcIndex}
              disabled={isDithering || !beadGrid}
            />
          )}
          {displayUrl ? (
            <Box
              component="span"
              // Keep key stable so number/grid overlays don't remount/clear
              // when toggling coloring mode.
              key={viewOriginal ? 'original' : 'dithered'}
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
              {/* Base image always visible so geometry matches preview/exports */}
              <img
                ref={imgRef}
                src={displayUrl}
                alt={viewOriginal ? 'Original' : 'Dithered'}
                draggable={false}
                style={{
                  imageRendering: 'pixelated',
                  width: displayWidth || undefined,
                  height: displayHeight || undefined,
                  display: 'block',
                  pointerEvents: 'none',
                  position: 'relative',
                  zIndex: 0,
                }}
                width={width}
                height={height}
              />

              {/* Numbers overlay */}
              {!viewOriginal && (
                <canvas
                  ref={numbersCanvasRef}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: displayWidth || 0,
                    height: displayHeight || 0,
                    pointerEvents: 'none',
                    zIndex: 30,
                  }}
                />
              )}

              {/* Grid overlay */}
              {showCellGrid && showGridLines && (
                <Box
                  component="span"
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: displayWidth || 0,
                    height: displayHeight || 0,
                    pointerEvents: 'none',
                    zIndex: 20,
                    backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                    backgroundSize: `${beadCellSizeX}px ${beadCellSizeY}px`,
                  }}
                />
              )}

              {/* Coloring overlay: transparent canvas handling pointer + cursor */}
              {isColoringMode && beadGrid && beadCols > 0 && beadRows > 0 && onUpdateBeadCells && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: displayWidth || 0,
                    height: displayHeight || 0,
                    zIndex: 10,
                  }}
                >
                  <BeadGridWebGL
                    beadGrid={beadGrid}
                    beadCols={beadCols}
                    beadRows={beadRows}
                    displayWidth={displayWidth || 0}
                    displayHeight={displayHeight || 0}
                    brushSizeCells={brushSizeCells}
                    selectedDmcIndex={selectedDmcIndex}
                    onPaint={onUpdateBeadCells}
                  />
                </Box>
              )}
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
