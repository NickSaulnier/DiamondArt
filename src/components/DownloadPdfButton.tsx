import Button from '@mui/material/Button';
import type { ColorEntry } from './ColorKey';
import { exportPatternPdf } from '../lib/exportPdf';

interface DownloadPdfButtonProps {
  beadGrid: number[][] | null;
  beadCols: number;
  beadRows: number;
  colorEntries: ColorEntry[];
  disabled?: boolean;
}

export function DownloadPdfButton({
  beadGrid,
  beadCols,
  beadRows,
  colorEntries,
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
      cellSize: 8,
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

