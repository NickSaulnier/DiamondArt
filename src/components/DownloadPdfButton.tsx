import Button from '@mui/material/Button';
import type { ColorEntry } from './ColorKey';
import { exportPatternPdf } from '../lib/exportPdf';
import { blockSizeToBeadDiameterMm } from '../lib/beadSize';

interface DownloadPdfButtonProps {
  beadGrid: number[][] | null;
  beadCols: number;
  beadRows: number;
  colorEntries: ColorEntry[];
  /** Pixelation block size from the last dither (4 / 5 / 6); maps to bead diameter in mm. */
  blockSize: number;
  disabled?: boolean;
}

export function DownloadPdfButton({
  beadGrid,
  beadCols,
  beadRows,
  colorEntries,
  blockSize,
  disabled,
}: DownloadPdfButtonProps) {
  const handleDownloadPdf = async () => {
    if (!beadGrid || beadCols <= 0 || beadRows <= 0 || colorEntries.length === 0) return;
    await exportPatternPdf({
      beadGrid,
      beadCols,
      beadRows,
      colorEntries,
      title: 'Dithered Bead Pattern',
      beadDiameterMm: blockSizeToBeadDiameterMm(blockSize),
      margin: 36,
    });
  };

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={handleDownloadPdf}
      disabled={disabled || !beadGrid || colorEntries.length === 0}
    >
      Download PDF
    </Button>
  );
}

