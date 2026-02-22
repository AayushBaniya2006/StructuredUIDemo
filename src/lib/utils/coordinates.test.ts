import { describe, expect, it } from 'vitest';
import { bboxToPixels, centerOnBbox } from './coordinates';

describe('coordinates utils', () => {
  it('converts normalized bbox to pixel coordinates', () => {
    const px = bboxToPixels({ x: 0.25, y: 0.5, width: 0.1, height: 0.2 }, 1000, 800);
    expect(px).toEqual({ x: 250, y: 400, width: 100, height: 160 });
  });

  it('calculates pan to center bbox at zoom 1', () => {
    const pan = centerOnBbox({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, 1000, 1000, 500, 500, 1);
    expect(pan).toEqual({ panX: -250, panY: -250 });
  });

  it('calculates pan to center bbox at higher zoom', () => {
    const pan = centerOnBbox({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, 1000, 1000, 500, 500, 2);
    expect(pan).toEqual({ panX: -150, panY: -150 });
  });
});
