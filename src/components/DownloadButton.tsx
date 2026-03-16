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

    let canvasToExport: HTMLCanvasElement = ditheredCanvas;

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
        let srcX = Math.floor(imgStartX * scaleDown);
        let srcY = Math.floor(imgStartY * scaleDown);
        let srcW = Math.ceil(imgW * scaleDown);
        let srcH = Math.ceil(imgH * scaleDown);

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
            canvasToExport = cropped;
          }
        }
      }
    }

    const url = canvasToExport.toDataURL('image/png');
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
