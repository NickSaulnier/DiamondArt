import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import type { RgbQuantOptions, DitherKernel, DitherMode } from '../lib/dithering';

const KERNELS: DitherKernel[] = [
  'FloydSteinberg',
  'FalseFloydSteinberg',
  'Stucki',
  'Atkinson',
  'Jarvis',
  'Burkes',
  'Sierra',
  'TwoSierra',
  'SierraLite',
];

interface DitherControlsProps {
  options: RgbQuantOptions;
  mode: DitherMode;
  blockSize: number;
  displayCellSize: number;
  onOptionsChange: (options: RgbQuantOptions) => void;
  onModeChange: (mode: DitherMode) => void;
  onBlockSizeChange: (value: number) => void;
  onDisplayCellSizeChange: (value: number) => void;
  onDither: () => void;
  hasImage: boolean;
  isAnalyzing: boolean;
  isDithering: boolean;
}

const BEAD_SIZE_OPTIONS: { label: string; blockSize: number }[] = [
  { label: '2.5 mm', blockSize: 4 },
  { label: '2.8 mm', blockSize: 5 },
  { label: '3.0 mm', blockSize: 6 },
];

export function DitherControls({
  options,
  mode,
  blockSize,
  displayCellSize,
  onOptionsChange,
  onModeChange,
  onBlockSizeChange,
  onDisplayCellSizeChange,
  onDither,
  hasImage,
  isDithering,
}: DitherControlsProps) {
  return (
    <Box className="space-y-6" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          Number of colors
        </Typography>
        <Slider
          value={options.colors}
          onChange={(_, value) =>
            onOptionsChange({ ...options, colors: Array.isArray(value) ? value[0] : value })
          }
          min={2}
          max={256}
          step={1}
          valueLabelDisplay="auto"
          disabled={!hasImage}
        />
      </Box>

      <FormControl size="small" fullWidth disabled={!hasImage}>
        <InputLabel>Dither algorithm</InputLabel>
        <Select
          value={mode}
          label="Dither algorithm"
          onChange={(e) => onModeChange(e.target.value as DitherMode)}
        >
          <MenuItem value="Error Diffusion">Error diffusion</MenuItem>
          <MenuItem value="Bayer">Bayer</MenuItem>
        </Select>
      </FormControl>

      {mode === 'Error Diffusion' && (
        <FormControl size="small" fullWidth disabled={!hasImage}>
          <InputLabel>Kernel</InputLabel>
          <Select
            value={options.dithKern ?? 'FloydSteinberg'}
            label="Kernel"
            onChange={(e) =>
              onOptionsChange({ ...options, dithKern: e.target.value as DitherKernel })
            }
          >
            {KERNELS.map((k) => (
              <MenuItem key={k} value={k}>
                {k}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {mode === 'Error Diffusion' && (
        <FormControlLabel
          control={
            <Checkbox
              checked={options.dithSerp ?? false}
              onChange={(e) => onOptionsChange({ ...options, dithSerp: e.target.checked })}
              disabled={!hasImage}
            />
          }
          label="Serpentine"
        />
      )}

      <Box>
        <FormControl size="small" fullWidth disabled={!hasImage}>
          <InputLabel>Bead size</InputLabel>
          <Select
            value={blockSize}
            label="Bead size"
            onChange={(e) => onBlockSizeChange(Number(e.target.value))}
          >
            {BEAD_SIZE_OPTIONS.map((opt) => (
              <MenuItem key={opt.label} value={opt.blockSize}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Display cell size (px)
        </Typography>
        <Slider
          value={displayCellSize}
          onChange={(_, value) =>
            onDisplayCellSizeChange(Array.isArray(value) ? value[0] : value)
          }
          min={4}
          max={32}
          step={1}
          valueLabelDisplay="auto"
          disabled={!hasImage}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onDither}
          disabled={!hasImage || isDithering}
        >
          {isDithering ? 'Dithering…' : 'Create Pattern'}
        </Button>
      </Box>
    </Box>
  );
}
