import type { MutableRefObject } from 'react';
import Button from '@mui/material/Button';
import type { PreviewViewState } from './PreviewPanel';

interface DownloadButtonProps {
  ditheredCanvas: HTMLCanvasElement | null;
  ditheredWidth: number;
  ditheredHeight: number;
  displayCellSize: number;
  blockSize: number;
  previewViewRef: MutableRefObject<PreviewViewState | null> | null;
  disabled?: boolean;
}

export function DownloadButton({
  ditheredCanvas,
  ditheredWidth,
  ditheredHeight,
  displayCellSize,
  blockSize,
  previewViewRef,
  disabled,
}: DownloadButtonProps) {
  const handleDownload = () => {
    if (!ditheredCanvas) return;

    const view = previewViewRef?.current;
    const scale = blockSize > 0 ? displayCellSize / blockSize : 1;
    const displayWidth = ditheredWidth * scale;
    const displayHeight = ditheredHeight * scale;

    let exportCanvas: HTMLCanvasElement = ditheredCanvas;
    let exportW = ditheredWidth;
    let exportH = ditheredHeight;

    if (
      view &&
      view.viewportWidth > 0 &&
      view.viewportHeight > 0 &&
      (displayWidth > view.viewportWidth || displayHeight > view.viewportHeight)
    ) {
      const { panX, panY, viewportWidth, viewportHeight } = view;
      const imgStartX = Math.max(0, -panX);
      const imgStartY = Math.max(0, -panY);
      const imgEndX = Math.min(displayWidth, viewportWidth - panX);
      const imgEndY = Math.min(displayHeight, viewportHeight - panY);
      const imgW = imgEndX - imgStartX;
      const imgH = imgEndY - imgStartY;

      if (imgW > 0 && imgH > 0) {
        const scaleDown = blockSize / displayCellSize;
        // Compute crop in source pixels, snapping to whole bead blocks so grid aligns exactly.
        let srcX = Math.floor((imgStartX * scaleDown) / blockSize) * blockSize;
        let srcY = Math.floor((imgStartY * scaleDown) / blockSize) * blockSize;
        let srcW = Math.floor((imgW * scaleDown) / blockSize) * blockSize;
        let srcH = Math.floor((imgH * scaleDown) / blockSize) * blockSize;

        srcX = Math.max(0, Math.min(srcX, ditheredWidth - 1));
        srcY = Math.max(0, Math.min(srcY, ditheredHeight - 1));
        srcW = Math.min(srcW, ditheredWidth - srcX);
        srcH = Math.min(srcH, ditheredHeight - srcY);

        if (srcW > 0 && srcH > 0) {
          const cropped = document.createElement('canvas');
          cropped.width = srcW;
          cropped.height = srcH;
          const ctx = cropped.getContext('2d');
          if (ctx) {
            const srcImage = ditheredCanvas as unknown as CanvasImageSource;
            ctx.drawImage(srcImage, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
            exportCanvas = cropped;
            exportW = srcW;
            exportH = srcH;
          }
        }
      }
    }

    const withGrid = blockSize >= 2;
    let finalCanvas: HTMLCanvasElement = exportCanvas;
    if (withGrid) {
      const gridW = exportW;
      const gridH = exportH;
      const out = document.createElement('canvas');
      out.width = gridW;
      out.height = gridH;
      const ctx = out.getContext('2d');
      if (ctx) {
        ctx.drawImage(exportCanvas as unknown as CanvasImageSource, 0, 0);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        // Match bead grid used during pixelation for this region only.
        const beadCols = blockSize > 0 ? Math.floor(gridW / blockSize) : 0;
        const beadRows = blockSize > 0 ? Math.floor(gridH / blockSize) : 0;
        const cellW = beadCols > 0 ? gridW / beadCols : 0;
        const cellH = beadRows > 0 ? gridH / beadRows : 0;

        if (cellW > 0 && cellH > 0) {
          for (let col = 0; col <= beadCols; col += 1) {
            const x = col * cellW;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, gridH);
            ctx.stroke();
          }
          for (let row = 0; row <= beadRows; row += 1) {
            const y = row * cellH;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(gridW, y);
            ctx.stroke();
          }
        }

        finalCanvas = out;
      }
    }

    const url = finalCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dithered.png';
    a.click();
  };

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={handleDownload}
      disabled={disabled || !ditheredCanvas}
    >
      Download PNG
    </Button>
  );
}
