import { useRef, useEffect, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
// DMC_PALETTE is not needed directly here; we operate on bead indices only.

interface BeadGridWebGLProps {
  beadGrid: number[][];
  beadCols: number;
  beadRows: number;
  displayWidth: number;
  displayHeight: number;
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
  brushSizeCells,
  selectedDmcIndex,
  onPaint,
}: BeadGridWebGLProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCopyRef = useRef<number[][]>([]);
  const isDrawingRef = useRef(false);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const cellSizeCssRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        width: displayWidth || 0,
        height: displayHeight || 0,
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
    </Box>
  );
}
