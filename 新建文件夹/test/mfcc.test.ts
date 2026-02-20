import { describe, it, expect } from 'vitest';
import { computeMFCC } from '../assets/mfcc';

describe('computeMFCC', () => {
  it('returns 13 coefficients for non-empty signal', () => {
    const sampleRate = 44100;
    const signal = new Float32Array(1000);
    for (let i = 0; i < signal.length; i++) {
      signal[i] = Math.random() * 2 - 1; // white noise
    }

    const mfcc = computeMFCC(signal, sampleRate);
    expect(mfcc).toHaveLength(13);

    // Check all values are finite numbers
    mfcc.forEach((v, i) => {
      expect(Number.isFinite(v)).toBe(true);
    });
  });

  it('handles zero signal', () => {
    const signal = new Float32Array(256).fill(0);
    const mfcc = computeMFCC(signal);
    expect(mfcc).toHaveLength(13);
    mfcc.forEach(v => expect(v).toBeCloseTo(0, 6));
  });

  it('handles short signal', () => {
    const signal = new Float32Array(100);
    for (let i = 0; i < 100; i++) {
      signal[i] = Math.sin(2 * Math.PI * 1000 * i / 44100);
    }
    const mfcc = computeMFCC(signal);
    expect(mfcc).toHaveLength(13);
    mfcc.forEach(v => expect(Number.isFinite(v)).toBe(true));
  });
});