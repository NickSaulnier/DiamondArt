/** Physical bead diameter (mm) for each pixelation block size used when dithering. */
const BEAD_DIAMETER_MM_BY_BLOCK_SIZE: Record<number, number> = {
  4: 2.5,
  5: 2.8,
  6: 3.0,
};

export const BEAD_SIZE_OPTIONS: readonly { label: string; blockSize: number }[] = [
  { label: '2.5 mm', blockSize: 4 },
  { label: '2.8 mm', blockSize: 5 },
  { label: '3.0 mm', blockSize: 6 },
];

const MM_PER_INCH = 25.4;

export function blockSizeToBeadDiameterMm(blockSize: number): number {
  return BEAD_DIAMETER_MM_BY_BLOCK_SIZE[blockSize] ?? 2.8;
}

/** PDF user space units are points (1/72"). */
export function mmToPdfPoints(mm: number): number {
  return (mm / MM_PER_INCH) * 72;
}

/** Pixels per millimeter at a given print resolution. */
export function mmToPixelsAtDpi(mm: number, dpi: number): number {
  return (mm * dpi) / MM_PER_INCH;
}

/** PNG exports use this DPI so printed size matches bead labels when printed at 100% / native resolution. */
export const PRINT_EXPORT_DPI = 300;

/**
 * Extra scale on export for print (PDF/PNG). 1.0 = exact labeled bead diameter; slightly above 1
 * compensates for typical printer/viewers. Increase if cells print small; decrease if too large.
 */
export const PRINT_CELL_SIZE_MULTIPLIER = 1.15;

/** Effective cell diameter (mm) used for PDF/PNG export. */
export function exportCellDiameterMm(beadDiameterMm: number): number {
  return beadDiameterMm * PRINT_CELL_SIZE_MULTIPLIER;
}
