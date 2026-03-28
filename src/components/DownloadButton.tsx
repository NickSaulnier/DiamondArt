import Button from '@mui/material/Button';
import { DMC_PALETTE } from '../lib/dmcPalette';
import {
  blockSizeToBeadDiameterMm,
  exportCellDiameterMm,
  mmToPixelsAtDpi,
  PRINT_EXPORT_DPI,
} from '../lib/beadSize';
import type { ColorEntry } from './ColorKey';

interface DownloadButtonProps {
  beadGrid: number[][] | null;
  beadCols: number;
  beadRows: number;
  colorEntries: ColorEntry[];
  /** Pixelation block size from the last dither (4 / 5 / 6); maps to bead diameter in mm for print resolution. */
  blockSize: number;
  disabled?: boolean;
}

export function DownloadButton({
  beadGrid,
  beadCols,
  beadRows,
  colorEntries,
  blockSize,
  disabled,
}: DownloadButtonProps) {
  const handleDownload = () => {
    if (!beadGrid || beadCols <= 0 || beadRows <= 0 || colorEntries.length === 0) return;

    const beadMm = blockSizeToBeadDiameterMm(blockSize);
    const cellMm = exportCellDiameterMm(beadMm);
    const cellSize = Math.max(1, Math.ceil(mmToPixelsAtDpi(cellMm, PRINT_EXPORT_DPI)));
    const exportW = beadCols * cellSize;
    const exportH = beadRows * cellSize;

    const canvas = document.createElement('canvas');
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const idByDmcIndex = new Map<number, number>();
    colorEntries.forEach(({ id, dmcIndex }) => {
      idByDmcIndex.set(dmcIndex, id);
    });

    const fontSize = Math.max(10, Math.min(22, cellSize * 0.45));
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

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

        const id = idByDmcIndex.get(dmcIndex);
        if (id != null) {
          ctx.fillStyle = '#000';
          ctx.fillText(String(id), x + cellSize / 2, y + 1);
        }
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
