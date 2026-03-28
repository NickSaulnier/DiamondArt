import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { DMC_PALETTE } from './dmcPalette';
import { exportCellDiameterMm, mmToPdfPoints } from './beadSize';

/** US Letter 8.5×11 in at 72 dpi (pdf-lib points). */
const US_LETTER = PageSizes.Letter;

export interface ExportPdfOptions {
  beadGrid: number[][];
  beadCols: number;
  beadRows: number;
  colorEntries: Array<{ id: number; dmcIndex: number }>;
  title?: string;
  /** Physical size of one bead cell on paper when not scaled down to fit the page (millimeters). */
  beadDiameterMm: number;
  margin?: number;
}

export async function exportPatternPdf({
  beadGrid,
  beadCols,
  beadRows,
  colorEntries,
  title = 'Dithered Pattern',
  beadDiameterMm,
  margin = 36,
}: ExportPdfOptions): Promise<void> {
  if (!beadGrid || beadCols <= 0 || beadRows <= 0 || colorEntries.length === 0) {
    return;
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const [pageWidth, pageHeight] = US_LETTER;
  const targetMm = exportCellDiameterMm(beadDiameterMm);
  let cellPt = mmToPdfPoints(targetMm);

  /** Space at top of each pattern page for title / page numbering. */
  const PATTERN_HEADER = 52;
  const availableWidth = pageWidth - 2 * margin;
  const availableHeight = pageHeight - 2 * margin - PATTERN_HEADER;

  // If a single cell is larger than the printable area, shrink to fit one cell (rare).
  if (cellPt > availableWidth || cellPt > availableHeight) {
    cellPt = Math.min(availableWidth, availableHeight);
  }

  const rowsPerPage = Math.max(1, Math.floor(availableHeight / cellPt));
  const colsPerPage = Math.max(1, Math.floor(availableWidth / cellPt));

  const rowTiles = Math.ceil(beadRows / rowsPerPage);
  const colTiles = Math.ceil(beadCols / colsPerPage);
  const totalPatternPages = rowTiles * colTiles;

  const actualCellMm = (cellPt / 72) * 25.4;
  const scaledFromTarget = cellPt < mmToPdfPoints(targetMm) - 0.02;

  /** Readable labels at craft distance: floor at ~10 pt, cap so two-digit IDs still fit. */
  const numberFontSize = Math.max(10, Math.min(18, cellPt * 0.42));

  const idByDmcIndex = new Map<number, number>();
  colorEntries.forEach(({ id, dmcIndex }) => {
    idByDmcIndex.set(dmcIndex, id);
  });

  let patternPageIndex = 0;
  for (let tr = 0; tr < rowTiles; tr += 1) {
    for (let tc = 0; tc < colTiles; tc += 1) {
      patternPageIndex += 1;
      const rowStart = tr * rowsPerPage;
      const rowEnd = Math.min(rowStart + rowsPerPage, beadRows);
      const colStart = tc * colsPerPage;
      const colEnd = Math.min(colStart + colsPerPage, beadCols);

      const tileRows = rowEnd - rowStart;
      const tileCols = colEnd - colStart;
      const gridWidth = tileCols * cellPt;
      const gridHeight = tileRows * cellPt;

      const page = pdfDoc.addPage(US_LETTER);
      const startX = margin + (availableWidth - gridWidth) / 2;
      const startY = pageHeight - margin - PATTERN_HEADER - gridHeight;

      for (let row = rowStart; row < rowEnd; row += 1) {
        const rowArr = beadGrid[row];
        for (let col = colStart; col < colEnd; col += 1) {
          const dmcIndex = rowArr[col] ?? 0;
          const dmc = DMC_PALETTE[dmcIndex] ?? DMC_PALETTE[0];
          const [r, g, b] = dmc.rgb;
          const x = startX + (col - colStart) * cellPt;
          const y = startY + (rowEnd - 1 - row) * cellPt;

          page.drawRectangle({
            x,
            y,
            width: cellPt,
            height: cellPt,
            color: rgb(r / 255, g / 255, b / 255),
          });

          const id = idByDmcIndex.get(dmcIndex);
          if (id != null) {
            const text = String(id);
            const textWidth = font.widthOfTextAtSize(text, numberFontSize);
            page.drawText(text, {
              x: x + (cellPt - textWidth) / 2,
              y: y + cellPt - numberFontSize * 0.9,
              size: numberFontSize,
              font,
              color: rgb(0, 0, 0),
            });
          }
        }
      }

      const titleFontSize = 12;
      const pageLabel =
        totalPatternPages > 1
          ? `${title} — pattern page ${patternPageIndex} of ${totalPatternPages}`
          : title;
      const pageLabelWidth = font.widthOfTextAtSize(pageLabel, titleFontSize);
      page.drawText(pageLabel, {
        x: (pageWidth - pageLabelWidth) / 2,
        y: pageHeight - margin / 2 - 4,
        size: titleFontSize,
        font,
        color: rgb(0, 0, 0),
      });

      const tileHint =
        totalPatternPages > 1
          ? `Rows ${rowStart + 1}–${rowEnd} · Cols ${colStart + 1}–${colEnd} · ${US_LETTER[0] / 72}"×${US_LETTER[1] / 72}"`
          : `${US_LETTER[0] / 72}"×${US_LETTER[1] / 72}" US Letter`;
      const footerParts = [
        tileHint,
        scaledFromTarget
          ? `Cell size ${actualCellMm.toFixed(2)} mm (max that fits one cell on letter; target ${targetMm.toFixed(2)} mm)`
          : `Cell size ${actualCellMm.toFixed(2)} mm (bead ${beadDiameterMm} mm)`,
      ];
      const footerText = footerParts.join(' · ');
      const footerFontSize = 8;
      const footerWidth = font.widthOfTextAtSize(footerText, footerFontSize);
      page.drawText(footerText, {
        x: (pageWidth - footerWidth) / 2,
        y: margin - 2,
        size: footerFontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  }

  const legendMargin = 40;
  const rowHeight = 14;
  const bottomMargin = legendMargin;
  let legendPage = pdfDoc.addPage(US_LETTER);
  let legendPageHeight = legendPage.getSize().height;
  let legendY = legendPageHeight - legendMargin;

  const drawLegendHeader = (p: typeof legendPage, isContinuation: boolean) => {
    p.drawText(isContinuation ? 'Color Key (continued)' : 'Color Key', {
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
      legendPage = pdfDoc.addPage(US_LETTER);
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
