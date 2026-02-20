import { describe, it, expect } from 'vitest';

// 模拟 calculateAverageVoicePrint 函数（从 offscreen/main.ts 提取）
const calculateAverageVoicePrint = (samples: number[][]): number[] => {
  if (samples.length === 0) return [];

  const result = new Array(13).fill(0);
  for (const sample of samples) {
    for (let i = 0; i < 13 && i < sample.length; i++) {
      result[i] += sample[i];
    }
  }
  return result.map(v => v / samples.length);
};

describe('calculateAverageVoicePrint', () => {
  it('returns empty array for no samples', () => {
    expect(calculateAverageVoicePrint([])).toEqual([]);
  });

  it('averages single sample correctly', () => {
    const samples = [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]];
    const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    expect(calculateAverageVoicePrint(samples)).toEqual(expected);
  });

  it('averages two samples correctly', () => {
    const samples = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    ];
    const expected = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    expect(calculateAverageVoicePrint(samples)).toEqual(expected);
  });

  it('handles shorter samples (truncates to 13)', () => {
    const samples = [
      [1, 2],        // only 2 values
      [3, 4, 5, 6],  // 4 values
      [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] // 14+ values
    ];
    const avg = calculateAverageVoicePrint(samples);
    // Expected values (exact fractions)
    const expected = [
      (1 + 3 + 7) / 3,
      (2 + 4 + 8) / 3,
      (0 + 5 + 9) / 3,
      (0 + 6 + 10) / 3,
      (0 + 0 + 11) / 3,
      (0 + 0 + 12) / 3,
      (0 + 0 + 13) / 3,
      (0 + 0 + 14) / 3,
      (0 + 0 + 15) / 3,
      (0 + 0 + 16) / 3,
      (0 + 0 + 17) / 3,
      (0 + 0 + 18) / 3,
      (0 + 0 + 19) / 3
    ];

    expected.forEach((val, i) => {
      expect(avg[i]).toBeCloseTo(val, 6);
    });
  });
});