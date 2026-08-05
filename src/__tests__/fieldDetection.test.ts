import { detectFieldRegions } from '../utils/fieldDetection';

const ruledCell = (width = 120, height = 60): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const black = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 0; data[i + 3] = 255;
  };
  for (let x = 10; x <= 110; x++) { black(x, 10); black(x, 45); }
  for (let y = 10; y <= 45; y++) { black(10, y); black(110, y); }
  return { width, height, data, colorSpace: 'srgb' } as ImageData;
};

it('detects a ruled field and reserves the printed-label area', () => {
  const regions = detectFieldRegions(ruledCell(), [{
    text: 'AGENCY', x: 14, y: 13, width: 35, height: 8, confidence: 99,
  }]);
  expect(regions).toHaveLength(1);
  expect(regions[0].label).toBe('agency');
  expect(regions[0].y).toBeGreaterThan(20);
});

it('rejects a structural row whose text consumes the cell', () => {
  const regions = detectFieldRegions(ruledCell(), [{
    text: 'ATTACHMENTS', x: 14, y: 24, width: 75, height: 14, confidence: 99,
  }]);
  expect(regions).toHaveLength(0);
});

it('rejects a large unlabeled table cell', () => {
  expect(detectFieldRegions(ruledCell())).toHaveLength(0);
});
