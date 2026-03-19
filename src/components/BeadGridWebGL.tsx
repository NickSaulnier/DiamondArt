import { useRef, useEffect, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
// DMC_PALETTE is not needed directly here; we operate on bead indices only.

interface BeadGridWebGLProps {
  beadGrid: number[][];
  beadCols: number;
  beadRows: number;
  displayWidth: number;
  displayHeight: number;
  displayUrl: string;
  showMagnifier: boolean;
  brushSizeCells: number;
  selectedDmcIndex: number;
  onPaint: (updates: Array<{ row: number; col: number; dmcIndex: number }>) => void;
}

// We keep a WebGL context for future GPU-based work, but currently use it only
// as a transparent overlay; the visible pixels come from the underlying <img>.

function getCellsInCircle(
  centerCol: number,
  centerRow: number,
  diameterCells: number,
  cols: number,
  rows: number
): Array<{ row: number; col: number }> {
  // `brushSizeCells` is treated as a *diameter* in cells (matches the cursor size).
  // Paint only cells whose *centers* fall inside the circular brush.
  const radius = Math.max(0, diameterCells / 2);
  const rCeil = Math.ceil(radius);
  const cells: Array<{ row: number; col: number }> = [];
  const r2 = radius * radius;
  for (let dy = -rCeil; dy <= rCeil; dy += 1) {
    for (let dx = -rCeil; dx <= rCeil; dx += 1) {
      if (dx * dx + dy * dy <= r2) {
        const col = centerCol + dx;
        const row = centerRow + dy;
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
          cells.push({ row, col });
        }
      }
    }
  }
  return cells;
}

export function BeadGridWebGL({
  beadGrid,
  beadCols,
  beadRows,
  displayWidth,
  displayHeight,
  displayUrl,
  showMagnifier,
  brushSizeCells,
  selectedDmcIndex,
  onPaint,
}: BeadGridWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCopyRef = useRef<number[][]>([]);
  const isDrawingRef = useRef(false);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const cellSizeCssRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const magnifierCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const magnifierImgRef = useRef<HTMLImageElement | null>(null);

  const syncGridCopy = useCallback(() => {
    gridCopyRef.current = beadGrid.map((row) => [...row]);
  }, [beadGrid]);

  useEffect(() => {
    syncGridCopy();
  }, [beadGrid, syncGridCopy]);

  const cellSizeX = beadCols > 0 ? displayWidth / beadCols : 0;
  const cellSizeY = beadRows > 0 ? displayHeight / beadRows : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || beadCols <= 0 || beadRows <= 0) return;

    const gl = canvas.getContext('webgl', { alpha: true });
    if (!gl) return;
    glRef.current = gl;

    return () => {
      glRef.current = null;
    };
  }, [beadCols, beadRows]);

  const drawScene = useCallback(
    () => {
      const canvas = canvasRef.current;
      const gl = glRef.current;
      if (!canvas || !gl) return;

      const w = canvas.width;
      const h = canvas.height;
      if (w <= 0 || h <= 0) return;

      gl.viewport(0, 0, w, h);
      // Clear alpha only; underlying <img> supplies the actual pixels.
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    [beadCols, beadRows]
  );

  useEffect(() => {
    drawScene();
  }, [beadGrid, beadCols, beadRows, displayWidth, displayHeight, drawScene]);

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const requestDrawRef = useRef<number | null>(null);
  const scheduleDraw = useCallback(
    () => {
      if (requestDrawRef.current != null) cancelAnimationFrame(requestDrawRef.current);
      requestDrawRef.current = requestAnimationFrame(() => {
        requestDrawRef.current = null;
        drawScene();
      });
    },
    [drawScene]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || cellSizeX <= 0 || cellSizeY <= 0) return;

      // Map pointer to canvas CSS space.
      const rect = canvas.getBoundingClientRect();
      const xCss = e.clientX - rect.left;
      const yCss = e.clientY - rect.top;

      // Each bead cell in CSS pixels (matches how the image is displayed).
      const cellSizeCssX = rect.width / beadCols;
      const cellSizeCssY = rect.height / beadRows;
      cellSizeCssRef.current = { x: cellSizeCssX, y: cellSizeCssY };

      // Bead-space indices from CSS coords: choose the cell the pointer is in.
      const cx = Math.min(
        beadCols - 1,
        Math.max(0, Math.floor(xCss / cellSizeCssX))
      );
      const cy = Math.min(
        beadRows - 1,
        Math.max(0, Math.floor(yCss / cellSizeCssY))
      );

      // Cursor is centered on the same bead indices we paint into.
      // Convert bead center back to CSS pixels for the overlay position.
      const centerXCss = (cx + 0.5) * cellSizeCssX;
      const centerYCss = (cy + 0.5) * cellSizeCssY;
      setCursorPos({ x: centerXCss, y: centerYCss });
      scheduleDraw();

      if (!isDrawingRef.current || beadCols <= 0 || beadRows <= 0) return;
      const cells = getCellsInCircle(cx, cy, brushSizeCells, beadCols, beadRows);
      const grid = gridCopyRef.current;
      const updates: Array<{ row: number; col: number; dmcIndex: number }> = [];
      for (const { row: r, col: c } of cells) {
        if (grid[r] && grid[r][c] !== selectedDmcIndex) {
          grid[r][c] = selectedDmcIndex;
          updates.push({ row: r, col: c, dmcIndex: selectedDmcIndex });
        }
      }
      if (updates.length > 0) {
        onPaint(updates);
      }
      drawScene();
    },
    [beadCols, beadRows, cellSizeX, cellSizeY, brushSizeCells, selectedDmcIndex, scheduleDraw, drawScene, onPaint]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      isDrawingRef.current = true;
      handlePointerMove(e);
    },
    [handlePointerMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      isDrawingRef.current = false;
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    setCursorPos(null);
    scheduleDraw();
    isDrawingRef.current = false;
  }, [scheduleDraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = Math.max(1, Math.round(displayWidth));
    const h = Math.max(1, Math.round(displayHeight));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      drawScene();
    }
  }, [displayWidth, displayHeight, drawScene, cursorPos]);

  const baseCellCss =
    beadCols > 0 && beadRows > 0
      ? Math.min(cellSizeCssRef.current.x || 0, cellSizeCssRef.current.y || 0)
      : 0;
  // Visually match one bead cell per brush unit: diameter ≈ cell size.
  const cursorDiameter =
    baseCellCss > 0 ? Math.max(4, Math.round(brushSizeCells * baseCellCss)) : 0;
  const magnifierSize = 140; // px
  const magnifierZoom = 3;
  const magnifierOffset = 10; // px from cursor

  const drawMagnifier = useCallback(() => {
    if (!showMagnifier || !cursorPos || !displayUrl) return;
    const canvas = magnifierCanvasRef.current;
    const img = magnifierImgRef.current;
    if (!canvas || !img) return;
    if (displayWidth <= 0 || displayHeight <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(magnifierSize * dpr));
    const h = Math.max(1, Math.round(magnifierSize * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    // Crop size in the same CSS-pixel coordinate space as cursorPos.
    const cropCssW = magnifierSize / magnifierZoom;
    const cropCssH = cropCssW;

    const halfW = cropCssW / 2;
    const halfH = cropCssH / 2;

    let sxCss = cursorPos.x - halfW;
    let syCss = cursorPos.y - halfH;

    sxCss = Math.max(0, Math.min(displayWidth - cropCssW, sxCss));
    syCss = Math.max(0, Math.min(displayHeight - cropCssH, syCss));

    // Convert CSS displayed coordinates to the image's natural pixel coordinates.
    const scaleX = img.naturalWidth / displayWidth;
    const scaleY = img.naturalHeight / displayHeight;

    const sx = sxCss * scaleX;
    const sy = syCss * scaleY;
    const sw = cropCssW * scaleX;
    const sh = cropCssH * scaleY;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }, [
    showMagnifier,
    cursorPos,
    displayUrl,
    displayWidth,
    displayHeight,
    magnifierSize,
    magnifierZoom,
  ]);

  useEffect(() => {
    if (!showMagnifier || !displayUrl) {
      magnifierImgRef.current = null;
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = displayUrl;
    img.onload = () => {
      magnifierImgRef.current = img;
      drawMagnifier();
    };
    img.onerror = () => {
      magnifierImgRef.current = null;
    };
  }, [showMagnifier, displayUrl, drawMagnifier]);

  useEffect(() => {
    drawMagnifier();
  }, [cursorPos, drawMagnifier]);

  const magnifierLeft = cursorPos
    ? Math.min(
        Math.max(0, cursorPos.x + magnifierOffset),
        displayWidth - magnifierSize
      )
    : 0;
  const magnifierTop = cursorPos
    ? Math.min(
        Math.max(0, cursorPos.y - magnifierSize - magnifierOffset),
        displayHeight - magnifierSize
      )
    : 0;

  // Magnifier crop is rendered via the canvas in `drawMagnifier`.

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        width: displayWidth || 0,
        height: displayHeight || 0,
        cursor: 'none',
      }}
    >
      <Box
        component="canvas"
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        sx={{
          display: 'block',
          width: displayWidth || 0,
          height: displayHeight || 0,
          imageRendering: 'pixelated',
          cursor: 'none',
        }}
        style={{
          width: displayWidth || 0,
          height: displayHeight || 0,
        }}
      />
      {cursorPos != null && (
        <Box
          sx={{
            position: 'absolute',
            left: cursorPos.x,
            top: cursorPos.y,
            width: cursorDiameter,
            height: cursorDiameter,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '1px solid #000',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
          }}
        />
      )}

      {cursorPos != null && displayUrl && showMagnifier && (
        <Box
          sx={{
            position: 'absolute',
            left: magnifierLeft,
            top: magnifierTop,
            width: magnifierSize,
            height: magnifierSize,
            borderRadius: 1,
            border: '1px solid rgba(0,0,0,0.25)',
            backgroundColor: 'rgba(255,255,255,0.9)',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          <canvas
            ref={magnifierCanvasRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: magnifierSize,
              height: magnifierSize,
              imageRendering: 'pixelated',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        </Box>
      )}
    </Box>
  );
}
