import { toPdfCoords } from '../utils/coords';

describe('toPdfCoords', () => {
  it('converts canvas top-left to PDF bottom-left space', () => {
    const viewport = { scale: 1.5, height: 1000 };
    const result = toPdfCoords(150, 250, viewport);
    expect(result.x).toBeCloseTo(100); // 150 / 1.5
    expect(result.y).toBeCloseTo(500); // (1000 - 250) / 1.5
  });

  it('maps canvas origin (0,0) to PDF top of page', () => {
    const viewport = { scale: 1, height: 792 };
    const result = toPdfCoords(0, 0, viewport);
    expect(result.x).toBe(0);
    expect(result.y).toBe(792);
  });
});
