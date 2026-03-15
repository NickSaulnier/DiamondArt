import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useDither } from './hooks/useDither';
import type { RgbQuantOptions, DitherMode } from './lib/dithering';
import { ImageUpload } from './components/ImageUpload';
import { DitherControls } from './components/DitherControls';
import { PreviewPanel } from './components/PreviewPanel';
import { ColorKey } from './components/ColorKey';
import { DownloadButton } from './components/DownloadButton';

const defaultOptions: RgbQuantOptions = {
  colors: 8,
  method: 2,
  boxSize: [8, 8],
  boxPxls: 2,
  initColors: 4096,
  minHueCols: 2000,
  dithKern: 'FloydSteinberg',
  dithDelta: 0,
  dithSerp: false,
  useCache: true,
  cacheFreq: 10,
  colorDist: 'euclidean',
};

function App() {
  const [mode, setMode] = useState<DitherMode>('Error Diffusion');
  const [blockSize, setBlockSize] = useState(1);
  const [options, setOptions] = useState<RgbQuantOptions>(defaultOptions);
  const [viewOriginal, setViewOriginal] = useState(false);

  const {
    sourceImage,
    sourceUrl,
    palette,
    ditheredCanvas,
    ditheredUrl,
    width,
    height,
    error,
    isAnalyzing,
    isDithering,
    setSourceImage,
    analyzePalette,
    runDither,
    clearError,
    setError,
  } = useDither();

  const handleImageLoad = useCallback(
    (image: HTMLImageElement, objectUrl: string) => {
      setSourceImage(image, objectUrl);
    },
    [setSourceImage]
  );

  const handleAnalyze = useCallback(() => {
    analyzePalette(options);
  }, [analyzePalette, options]);

  const handleDither = useCallback(() => {
    runDither(options, mode, blockSize);
  }, [runDither, options, mode, blockSize]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <span className="text-lg font-medium">Diamond Art</span>
        <nav className="flex gap-8 text-sm">
          <a href="#home" className="hover:underline">
            Home
          </a>
          <a href="#about" className="hover:underline">
            About
          </a>
          <a href="#instructions" className="hover:underline">
            Instructions
          </a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
            gap: 6,
            alignItems: 'start',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Typography variant="h6" fontWeight={600}>
              Upload &amp; options
            </Typography>
            <ImageUpload onImageLoad={handleImageLoad} onError={setError} />
            <DitherControls
              options={options}
              mode={mode}
              blockSize={blockSize}
              onOptionsChange={setOptions}
              onModeChange={setMode}
              onBlockSizeChange={setBlockSize}
              onAnalyze={handleAnalyze}
              onDither={handleDither}
              hasImage={!!sourceImage}
              isAnalyzing={isAnalyzing}
              isDithering={isDithering}
            />
            <ColorKey palette={palette} />
            <DownloadButton ditheredCanvas={ditheredCanvas} />
          </Box>

          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Preview
            </Typography>
            <PreviewPanel
              sourceUrl={sourceUrl}
              ditheredUrl={ditheredUrl}
              width={width}
              height={height}
              viewOriginal={viewOriginal}
              onToggleView={() => setViewOriginal((v) => !v)}
              isDithering={isDithering}
            />
          </Box>
        </Box>
      </main>
    </div>
  );
}

export default App;
