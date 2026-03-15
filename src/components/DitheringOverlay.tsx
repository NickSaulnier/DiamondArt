import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Lottie from 'lottie-react';

interface DitheringOverlayProps {
  visible: boolean;
}

export function DitheringOverlay({ visible }: DitheringOverlayProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/animations/loading.json')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      {animationData ? (
        <Box sx={{ width: 120, height: 120 }}>
          <Lottie animationData={animationData} loop />
        </Box>
      ) : (
        <Box
          sx={{
            width: 40,
            height: 40,
            border: '2px solid rgba(0,0,0,0.08)',
            borderTopColor: '#111',
            borderRadius: '50%',
            animation: 'dither-spin 0.8s linear infinite',
            '@keyframes dither-spin': {
              to: { transform: 'rotate(360deg)' },
            },
          }}
        />
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Dithering…
      </Typography>
    </Box>
  );
}
