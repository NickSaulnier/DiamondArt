import { useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement, objectUrl: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageLoad, onError, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        onError?.('Please select an image file.');
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        onImageLoad(img, url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        onError?.('Failed to load image.');
      };
      img.src = url;
    },
    [onImageLoad, onError]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onButtonClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onInputChange}
        style={{ display: 'none' }}
      />
      <Box
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={disabled ? undefined : onButtonClick}
        sx={{
          border: '1px dashed rgba(0,0,0,0.2)',
          borderRadius: 0,
          py: 4,
          px: 3,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          backgroundColor: 'rgba(0,0,0,0.02)',
          '&:hover': disabled ? {} : { backgroundColor: 'rgba(0,0,0,0.04)' },
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Drop an image here or click to select
        </Typography>
      </Box>
    </Box>
  );
}
