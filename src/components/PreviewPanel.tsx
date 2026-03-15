import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface PreviewPanelProps {
  sourceUrl: string | null;
  ditheredUrl: string | null;
  width: number;
  height: number;
  viewOriginal: boolean;
  onToggleView: () => void;
  isDithering?: boolean;
}

export function PreviewPanel({
  sourceUrl,
  ditheredUrl,
  width,
  height,
  viewOriginal,
  onToggleView,
  isDithering = false,
}: PreviewPanelProps) {
  const showDithered = ditheredUrl != null;
  const displayUrl = viewOriginal ? sourceUrl : (ditheredUrl ?? sourceUrl);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0 }}>
      {isDithering && (
        <Typography variant="body2" color="text.secondary">
          Dithering…
        </Typography>
      )}
      {showDithered && !isDithering && (
        <button
          type="button"
          onClick={onToggleView}
          className="text-left text-sm underline hover:no-underline text-gray-700"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {viewOriginal ? 'Show dithered' : 'Show original'}
        </button>
      )}
      <Box
        sx={{
          border: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          minHeight: '70vh',
          p: 3,
        }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={viewOriginal ? 'Original' : 'Dithered'}
            style={{
              maxWidth: '100%',
              height: 'auto',
              maxHeight: '85vh',
              objectFit: 'contain',
            }}
            width={width}
            height={height}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Preview will appear here
          </Typography>
        )}
      </Box>
    </Box>
  );
}
