import Button from '@mui/material/Button';

interface DownloadButtonProps {
  ditheredCanvas: HTMLCanvasElement | null;
  disabled?: boolean;
}

export function DownloadButton({ ditheredCanvas, disabled }: DownloadButtonProps) {
  const handleDownload = () => {
    if (!ditheredCanvas) return;
    const url = ditheredCanvas.toDataURL('image/png');
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
