import type { RGBTriplet } from './ditherUtils';

export interface DmcColor {
  code: string;
  name: string;
  rgb: RGBTriplet;
}

// NOTE: This is a starter subset of the full DMC table.
// You can extend this list using the chart at:
// https://www.cassandramdias.com/dmc-colors-to-rgb-conversion-chart
export const DMC_PALETTE: DmcColor[] = [
  { code: '310', name: 'Black', rgb: [0, 0, 0] },
  { code: 'B5200', name: 'Snow White', rgb: [255, 255, 255] },
  { code: '3713', name: 'Salmon Very Light', rgb: [255, 226, 226] },
  { code: '761', name: 'Salmon Light', rgb: [255, 201, 201] },
  { code: '760', name: 'Salmon', rgb: [245, 173, 173] },
  { code: '3712', name: 'Salmon Medium', rgb: [241, 135, 135] },
  { code: '347', name: 'Salmon Very Dark', rgb: [191, 45, 45] },
  { code: '666', name: 'Bright Red', rgb: [227, 29, 66] },
  { code: '321', name: 'Red', rgb: [199, 43, 59] },
  { code: '304', name: 'Red Medium', rgb: [183, 31, 51] },
  { code: '498', name: 'Red Dark', rgb: [167, 19, 43] },
  { code: '814', name: 'Garnet Dark', rgb: [123, 0, 27] },
  { code: '444', name: 'Lemon Dark', rgb: [255, 214, 0] },
  { code: '743', name: 'Yellow Medium', rgb: [254, 211, 118] },
  { code: '742', name: 'Tangerine Light', rgb: [255, 191, 87] },
  { code: '741', name: 'Tangerine Medium', rgb: [255, 163, 43] },
  { code: '740', name: 'Tangerine', rgb: [255, 139, 0] },
  { code: '972', name: 'Canary Deep', rgb: [255, 181, 21] },
  { code: '703', name: 'Chartreuse', rgb: [123, 181, 71] },
  { code: '702', name: 'Kelly Green', rgb: [71, 167, 47] },
  { code: '701', name: 'Green Light', rgb: [63, 143, 41] },
  { code: '700', name: 'Green Bright', rgb: [7, 115, 27] },
  { code: '699', name: 'Green', rgb: [5, 101, 23] },
  { code: '995', name: 'Electric Blue Dark', rgb: [38, 150, 182] },
  { code: '996', name: 'Electric Blue Medium', rgb: [48, 194, 236] },
  { code: '3843', name: 'Electric Blue', rgb: [20, 170, 208] },
  { code: '797', name: 'Royal Blue', rgb: [19, 71, 125] },
  { code: '820', name: 'Royal Blue Very Dark', rgb: [14, 54, 92] },
  { code: '550', name: 'Violet Very Dark', rgb: [92, 24, 78] },
  { code: '208', name: 'Lavender Very Dark', rgb: [131, 91, 139] },
  { code: '209', name: 'Lavender Dark', rgb: [163, 123, 167] },
  { code: '210', name: 'Lavender Medium', rgb: [195, 159, 195] },
  { code: '211', name: 'Lavender Light', rgb: [227, 203, 227] },
  { code: '415', name: 'Pearl Gray', rgb: [211, 211, 214] },
  { code: '318', name: 'Steel Gray Light', rgb: [171, 171, 171] },
  { code: '414', name: 'Steel Gray Dark', rgb: [140, 140, 140] },
  { code: '762', name: 'Pearl Gray Very Light', rgb: [236, 236, 236] },
];

export function getDmcPalette(): RGBTriplet[] {
  return DMC_PALETTE.map((c) => c.rgb);
}

export function findNearestDmcColor(target: RGBTriplet): DmcColor {
  let best = DMC_PALETTE[0];
  let bestDist = Number.POSITIVE_INFINITY;
  const [r2, g2, b2] = target;
  for (let i = 0; i < DMC_PALETTE.length; i += 1) {
    const [r1, g1, b1] = DMC_PALETTE[i].rgb;
    const dist = (r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = DMC_PALETTE[i];
    }
  }
  return best;
}

