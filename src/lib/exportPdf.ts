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

  const availableWidth = pageWidth - 2 * margin;
  const availableHeight = pageHeight - 2 * margin;
  const maxCellSizeW = availableWidth / beadCols;
  const maxCellSizeH = availableHeight / beadRows;
  const cellSizeFitted = Math.max(
    0.5,
    Math.min(cellSize, maxCellSizeW, maxCellSizeH)
  );

  const gridWidth = beadCols * cellSizeFitted;
  const gridHeight = beadRows * cellSizeFitted;
  const startX = margin + (availableWidth - gridWidth) / 2;
  const startY = pageHeight - margin - gridHeight;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = Math.max(4, Math.min(8, cellSizeFitted * 0.4));

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
      const x = startX + col * cellSizeFitted;
      const y = startY + (beadRows - 1 - row) * cellSizeFitted;

      page.drawRectangle({
        x,
        y,
        width: cellSizeFitted,
        height: cellSizeFitted,
        color: rgb(r / 255, g / 255, b / 255),
      });

      const id = idByDmcIndex.get(dmcIndex);
      if (id != null) {
        const text = String(id);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: x + (cellSizeFitted - textWidth) / 2,
          y: y + cellSizeFitted - fontSize * 0.9,
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

  const legendMargin = 40;
  const rowHeight = 14;
  const bottomMargin = legendMargin;
  let legendPage = pdfDoc.addPage();
  let legendPageHeight = legendPage.getSize().height;
  let legendY = legendPageHeight - legendMargin;

  const drawLegendHeader = (page: typeof legendPage, isContinuation: boolean) => {
    page.drawText(isContinuation ? 'Color Key (continued)' : 'Color Key', {
      x: legendMargin,
      y: legendY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    legendY -= rowHeight;
  };

  drawLegendHeader(legendPage, false);

  for (let i = 0; i < colorEntries.length; i += 1) {
    if (legendY - rowHeight < bottomMargin) {
      legendPage = pdfDoc.addPage();
      legendPageHeight = legendPage.getSize().height;
      legendY = legendPageHeight - legendMargin;
      drawLegendHeader(legendPage, true);
    }

    const { id, dmcIndex } = colorEntries[i];
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
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pattern.pdf';
  a.click();
  URL.revokeObjectURL(url);
}

