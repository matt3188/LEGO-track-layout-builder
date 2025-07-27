import { describe, it, expect } from 'vitest';
import { useAutoLayout } from '../composables/useAutoLayout';

describe('generateAutoLayout', () => {
  const { generateAutoLayout } = useAutoLayout();

  it('creates a perfect circle with 16 curves', () => {
    const pieces = generateAutoLayout(0, 16);
    expect(pieces.length).toBe(16);
    expect(pieces.every(p => p.type === 'curve')).toBe(true);
  });

  it('creates an oval loop with 8 straights and 16 curves', () => {
    const pieces = generateAutoLayout(8, 16);
    expect(pieces.length).toBe(24);
  });

  it('creates a connected loop using all pieces', () => {
    const pieces = generateAutoLayout(3, 4);
    expect(pieces.length).toBe(7);
  });
});
