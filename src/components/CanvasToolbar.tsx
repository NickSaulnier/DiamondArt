import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { Brush } from '@mui/icons-material';
import { DMC_PALETTE } from '../lib/dmcPalette';

interface CanvasToolbarProps {
  isColoringMode: boolean;
  onColoringModeChange: (active: boolean) => void;
  brushSizeCells: number;
  onBrushSizeChange: (size: number) => void;
  selectedDmcIndex: number;
  onSelectedDmcIndexChange: (index: number) => void;
  disabled?: boolean;
}

const BRUSH_SIZE_MIN = 1;
const BRUSH_SIZE_MAX = 20;

export function CanvasToolbar({
  isColoringMode,
  onColoringModeChange,
  brushSizeCells,
  onBrushSizeChange,
  selectedDmcIndex,
  onSelectedDmcIndexChange,
  disabled = false,
}: CanvasToolbarProps) {
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      sx={{
        position: 'absolute',
        right: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: (theme) => theme.zIndex.modal + 1,
        width: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        padding: 1,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Tooltip title="Activate Coloring Mode" placement="left">
        <span>
          <IconButton
            size="small"
            onClick={() => onColoringModeChange(!isColoringMode)}
            disabled={disabled}
            color={isColoringMode ? 'primary' : 'default'}
            aria-pressed={isColoringMode}
          >
            <Brush fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {isColoringMode && (
        <>
          <Tooltip title="Brush size (cells)" placement="left">
            <Box sx={{ width: 36, mt: 0.5 }}>
              <Slider
                size="small"
                value={brushSizeCells}
                onChange={(_, value) =>
                  onBrushSizeChange(Array.isArray(value) ? value[0] : value)
                }
                min={BRUSH_SIZE_MIN}
                max={BRUSH_SIZE_MAX}
                step={1}
                valueLabelDisplay="auto"
                orientation="vertical"
                sx={{ height: 80 }}
              />
            </Box>
          </Tooltip>
          <Tooltip title="Pick DMC color" placement="left">
            <Box
              component="button"
              type="button"
              onClick={(e) => setColorAnchor(e.currentTarget)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                padding: 0,
                cursor: 'pointer',
                backgroundColor: `rgb(${DMC_PALETTE[selectedDmcIndex]?.rgb.join(',') ?? '0,0,0'})`,
              }}
              aria-label="Pick color"
            />
          </Tooltip>
          <Popover
            open={Boolean(colorAnchor)}
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
            transformOrigin={{ vertical: 'center', horizontal: 'right' }}
          >
            <Box sx={{ p: 1, maxHeight: 320, overflowY: 'auto', width: 220 }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                DMC color
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.5 }}>
                {DMC_PALETTE.map((dmc, index) => (
                  <Box
                    key={`${dmc.code}-${index}`}
                    component="button"
                    type="button"
                    onClick={() => {
                      onSelectedDmcIndexChange(index);
                      setColorAnchor(null);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 0.5,
                      border: '1px solid',
                      borderColor: selectedDmcIndex === index ? 'primary.main' : 'transparent',
                      borderRadius: 0.5,
                      cursor: 'pointer',
                      backgroundColor: selectedDmcIndex === index ? 'action.selected' : 'transparent',
                      textAlign: 'left',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                        borderRadius: 0.25,
                        backgroundColor: `rgb(${dmc.rgb[0]},${dmc.rgb[1]},${dmc.rgb[2]})`,
                        border: '1px solid rgba(0,0,0,0.2)',
                      }}
                    />
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                      {dmc.code} {dmc.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Popover>
        </>
      )}
    </Box>
  );
}
