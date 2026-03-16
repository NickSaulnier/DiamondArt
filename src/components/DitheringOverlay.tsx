import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface DitheringOverlayProps {
  visible: boolean;
}

export function DitheringOverlay({ visible }: DitheringOverlayProps) {
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        zIndex: 10,
      }}
    >
      <Box className="dither-spinner" />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Dithering…
      </Typography>
    </Box>
  );
}
