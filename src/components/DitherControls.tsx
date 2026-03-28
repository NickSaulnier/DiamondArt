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
import { BEAD_SIZE_OPTIONS } from '../lib/beadSize';

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
  /** Max width (px) of the working image before dithering; lower = fewer beads. */
  patternMaxWidthPx: number;
  /** Natural width of the loaded image (for bead estimates). */
  sourceNaturalWidth?: number;
  displayCellSize: number;
  usedColorCount?: number;
  onOptionsChange: (options: RgbQuantOptions) => void;
  onModeChange: (mode: DitherMode) => void;
  onBlockSizeChange: (value: number) => void;
  onPatternMaxWidthPxChange: (value: number) => void;
  onDisplayCellSizeChange: (value: number) => void;
  onDither: () => void;
  hasImage: boolean;
  isAnalyzing: boolean;
  isDithering: boolean;
}

export function DitherControls({
  options,
  mode,
  blockSize,
  patternMaxWidthPx,
  sourceNaturalWidth = 0,
  displayCellSize,
  usedColorCount,
  onOptionsChange,
  onModeChange,
  onBlockSizeChange,
  onPatternMaxWidthPxChange,
  onDisplayCellSizeChange,
  onDither,
  hasImage,
  isDithering,
}: DitherControlsProps) {
  const effectiveWidth =
    sourceNaturalWidth > 0 ? Math.min(sourceNaturalWidth, patternMaxWidthPx) : patternMaxWidthPx;
  const approxBeadCols =
    blockSize > 0 && effectiveWidth > 0 ? Math.floor(effectiveWidth / blockSize) : null;

  return (
    <Box className="space-y-6" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          Max Number of colors
        </Typography>
        <Slider
          value={options.colors}
          onChange={(_, value) =>
            onOptionsChange({ ...options, colors: Array.isArray(value) ? value[0] : value })
          }
          min={2}
          max={64}
          step={1}
          valueLabelDisplay="auto"
          disabled={!hasImage}
        />
        {typeof usedColorCount === 'number' && (
          <Typography variant="caption" color="text.secondary">
            DMC colors used: {usedColorCount}
          </Typography>
        )}
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
          Pattern width (pixels)
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Caps how wide the image is before dithering (always measured from your original photo).
          Lower values mean fewer beads.           If the photo is already narrower than this cap, increasing it
          won&apos;t add detail until the cap exceeds the photo width. Raise toward 4000 for
          maximum detail on large images.
        </Typography>
        <Slider
          value={patternMaxWidthPx}
          onChange={(_, value) =>
            onPatternMaxWidthPxChange(Array.isArray(value) ? value[0] : value)
          }
          min={200}
          max={4000}
          step={50}
          valueLabelDisplay="auto"
          disabled={!hasImage}
        />
        {approxBeadCols != null && (
          <Typography variant="caption" color="text.secondary">
            About {approxBeadCols} beads wide (height scales proportionally)
          </Typography>
        )}
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
