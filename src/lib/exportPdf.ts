import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DMC_PALETTE } from './dmcPalette';

export interface ExportPdfOptions {
  beadGrid: number[][];
  beadCols: number;
  beadRows: number;
  colorEntries: Array<{ id: number; dmcIndex: number }>;
  title?: string;
  cellSize?: number;
  margin?: number;
}

export async function exportPatternPdf({
  beadGrid,
  beadCols,
  beadRows,
  colorEntries,
  title = 'Dithered Pattern',
  cellSize = 10,
  margin = 36,
}: ExportPdfOptions): Promise<void> {
  if (!beadGrid || beadCols <= 0 || beadRows <= 0 || colorEntries.length === 0) {
    return;
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const gridHeight = beadRows * cellSize;

  const startX = margin;
  const startY = pageHeight - margin - gridHeight;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = Math.max(4, Math.min(8, cellSize * 0.4));

  const idByDmcIndex = new Map<number, number>();
  colorEntries.forEach(({ id, dmcIndex }) => {
    idByDmcIndex.set(dmcIndex, id);
  });

  for (let row = 0; row < beadRows; row += 1) {
    const rowArr = beadGrid[row];
    for (let col = 0; col < beadCols; col += 1) {
      const dmcIndex = rowArr[col] ?? 0;
      const dmc = DMC_PALETTE[dmcIndex] ?? DMC_PALETTE[0];
      const [r, g, b] = dmc.rgb;
      const x = startX + col * cellSize;
      const y = startY + (beadRows - 1 - row) * cellSize;

      page.drawRectangle({
        x,
        y,
        width: cellSize,
        height: cellSize,
        color: rgb(r / 255, g / 255, b / 255),
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.25,
      });

      const id = idByDmcIndex.get(dmcIndex);
      if (id != null) {
        const text = String(id);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: x + (cellSize - textWidth) / 2,
          y: y + cellSize - fontSize * 0.9,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  const titleFontSize = 14;
  const titleWidth = font.widthOfTextAtSize(title, titleFontSize);
  page.drawText(title, {
    x: (pageWidth - titleWidth) / 2,
    y: pageHeight - margin / 2,
    size: titleFontSize,
    font,
    color: rgb(0, 0, 0),
  });

  const legendPage = pdfDoc.addPage();
  const legendMargin = 40;
  const rowHeight = 16;
  let legendY = legendPage.getSize().height - legendMargin;

  legendPage.drawText('Color Key', {
    x: legendMargin,
    y: legendY,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  legendY -= rowHeight;

  colorEntries.forEach(({ id, dmcIndex }) => {
    const dmc = DMC_PALETTE[dmcIndex] ?? DMC_PALETTE[0];
    const [r, g, b] = dmc.rgb;

    legendPage.drawRectangle({
      x: legendMargin,
      y: legendY - 4,
      width: 12,
      height: 12,
      color: rgb(r / 255, g / 255, b / 255),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.25,
    });

    legendPage.drawText(String(id), {
      x: legendMargin + 20,
      y: legendY,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    legendPage.drawText(`${dmc.code} – ${dmc.name}`, {
      x: legendMargin + 50,
      y: legendY,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    legendY -= rowHeight;
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pattern.pdf';
  a.click();
  URL.revokeObjectURL(url);
}

