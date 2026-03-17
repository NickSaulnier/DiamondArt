import Button from '@mui/material/Button';
import { DMC_PALETTE } from '../lib/dmcPalette';

interface DownloadButtonProps {
  beadGrid: number[][] | null;
  beadCols: number;
  beadRows: number;
  disabled?: boolean;
}

export function DownloadButton({ beadGrid, beadCols, beadRows, disabled }: DownloadButtonProps) {
  const handleDownload = () => {
    if (!beadGrid || beadCols <= 0 || beadRows <= 0) return;

    const cellSize = 24; // export cell size in pixels
    const exportW = beadCols * cellSize;
    const exportH = beadRows * cellSize;

    const canvas = document.createElement('canvas');
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let row = 0; row < beadRows; row += 1) {
      const rowArr = beadGrid[row];
      for (let col = 0; col < beadCols; col += 1) {
        const dmcIndex = rowArr[col] ?? 0;
        const dmc = DMC_PALETTE[dmcIndex] ?? DMC_PALETTE[0];
        const [r, g, b] = dmc.rgb;
        const x = col * cellSize;
        const y = row * cellSize;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }

    const url = canvas.toDataURL('image/png');
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
      disabled={disabled || !beadGrid}
    >
      Download PNG
    </Button>
  );
}
