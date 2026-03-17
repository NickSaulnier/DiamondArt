import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { DmcColor } from '../lib/dmcPalette';

export interface ColorEntry {
  id: number;
  dmc: DmcColor;
}

interface ColorKeyProps {
  colors: ColorEntry[];
}

export function ColorKey({ colors }: ColorKeyProps) {
  if (!colors || colors.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Color key
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          maxHeight: 200,
          overflowY: 'auto',
        }}
      >
        {colors.map(({ id, dmc }) => (
          <Box
            key={dmc.code}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: 12,
            }}
          >
            <Box
              sx={{
                minWidth: 20,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {id}
            </Box>
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: `rgb(${dmc.rgb[0]},${dmc.rgb[1]},${dmc.rgb[2]})`,
                border: '1px solid rgba(0,0,0,0.2)',
              }}
            />
            <Box sx={{ minWidth: 50 }}>{dmc.code}</Box>
            <Box sx={{ color: 'text.secondary', fontSize: 11, whiteSpace: 'nowrap' }}>
              {dmc.name}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
