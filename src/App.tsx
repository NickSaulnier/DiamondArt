import { useState, useCallback, useRef, useEffect } from 'react';
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
import { DownloadPdfButton } from './components/DownloadPdfButton';
import type { PreviewViewState } from './components/PreviewPanel';

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
  const [blockSize, setBlockSize] = useState(5);
  const [displayCellSize, setDisplayCellSize] = useState(6);
  const [options, setOptions] = useState<RgbQuantOptions>(defaultOptions);
  const [viewOriginal, setViewOriginal] = useState(false);
  const previewViewRef = useRef<PreviewViewState | null>(null);

  const {
    sourceImage,
    sourceUrl,
    ditheredUrl,
    width,
    height,
    beadGrid,
    beadCols,
    beadRows,
    colorEntries,
    blockSizeUsed,
    error,
    isAnalyzing,
    isDithering,
    setSourceImage,
    runDither,
    updateBeadCells,
    clearError,
    setError,
  } = useDither();

  const handleImageLoad = useCallback(
    (image: HTMLImageElement, objectUrl: string) => {
      setSourceImage(image, objectUrl);
    },
    [setSourceImage]
  );

  const handleDither = useCallback(() => {
    runDither(options, mode, blockSize);
  }, [runDither, options, mode, blockSize]);

  useEffect(() => {
    if (ditheredUrl) setViewOriginal(false);
  }, [ditheredUrl]);

  return (
    <div className="h-screen bg-white text-gray-900 flex flex-col overflow-hidden">
      <header className="border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <span className="text-lg font-medium">Diamond Art</span>
      </header>

      <main className="w-full flex-1 min-h-0 flex flex-col overflow-hidden pt-4 pb-4">
        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 2, mx: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '304px 1fr' },
            width: '100%',
            height: '100%',
            minHeight: 0,
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              px: 3,
              py: 2,
              borderRight: { md: '1px solid rgba(0,0,0,0.08)' },
              width: { md: 304 },
              maxWidth: { md: 304 },
              height: '100%',
              maxHeight: '100%',
              overflowY: 'auto',
              flexShrink: 0,
              minHeight: 0,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Upload &amp; options
            </Typography>
            <ImageUpload onImageLoad={handleImageLoad} onError={setError} />
            <DitherControls
              options={options}
              mode={mode}
              blockSize={blockSize}
              displayCellSize={displayCellSize}
              usedColorCount={colorEntries.length}
              onOptionsChange={setOptions}
              onModeChange={setMode}
              onBlockSizeChange={setBlockSize}
              onDisplayCellSizeChange={setDisplayCellSize}
              onDither={handleDither}
              hasImage={!!sourceImage}
              isAnalyzing={isAnalyzing}
              isDithering={isDithering}
            />
            <ColorKey colors={colorEntries} />
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <DownloadButton
                beadGrid={beadGrid}
                beadCols={beadCols}
                beadRows={beadRows}
                colorEntries={colorEntries}
              />
              <DownloadPdfButton
                beadGrid={beadGrid}
                beadCols={beadCols}
                beadRows={beadRows}
                colorEntries={colorEntries}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              px: 2,
              py: 2,
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Preview
            </Typography>
            <PreviewPanel
              sourceUrl={sourceUrl}
              ditheredUrl={ditheredUrl}
              width={width}
              height={height}
              blockSize={blockSizeUsed || blockSize}
              beadCols={beadCols}
              beadRows={beadRows}
              beadGrid={beadGrid}
              colorEntries={colorEntries}
              displayCellSize={displayCellSize}
              onDisplayCellSizeChange={setDisplayCellSize}
              viewOriginal={viewOriginal}
              onToggleView={() => setViewOriginal((v) => !v)}
              isDithering={isDithering}
              previewViewRef={previewViewRef}
              onUpdateBeadCells={updateBeadCells}
            />
          </Box>
        </Box>
      </main>
    </div>
  );
}

export default App;
