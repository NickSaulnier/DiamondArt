import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { RGBTriplet } from '../lib/dithering';

interface ColorKeyProps {
  palette: RGBTriplet[];
}

export function ColorKey({ palette }: ColorKeyProps) {
  if (palette.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        Color key
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
        }}
      >
        {palette.map(([r, g, b], i) => (
          <Box
            key={`${r}-${g}-${b}-${i}`}
            sx={{
              width: 24,
              height: 24,
              backgroundColor: `rgb(${r},${g},${b})`,
              border: '1px solid rgba(0,0,0,0.15)',
            }}
            title={`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')} (${i + 1})`}
          />
        ))}
      </Box>
    </Box>
  );
}
