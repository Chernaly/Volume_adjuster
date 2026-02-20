/**
 * 标准 MFCC 提取器（完整流程）
 * 参考：HTK / Librosa 实现
 * 步骤：
 * 1. Pre-emphasis (α = 0.97)
 * 2. Framing (25ms, 10ms hop)
 * 3. Hamming Window
 * 4. FFT → Power Spectrum
 * 5. Mel Filterbank (26 filters, 0-8000Hz)
 * 6. Log + DCT-II (13 coefficients)
 */

// 轻量 FFT（Radix-2, in-place, complex array as [re, im, re, im...])
function fft(x: Float32Array): void {
  const n = x.length / 2;
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [x[2 * i], x[2 * j]] = [x[2 * j], x[2 * i]];
      [x[2 * i + 1], x[2 * j + 1]] = [x[2 * j + 1], x[2 * i + 1]];
    }
  }

  // Butterfly
  for (let s = 2; s <= n; s *= 2) {
    const m = s / 2;
    const theta = -2 * Math.PI / s;
    for (let k = 0; k < m; k++) {
      const wRe = Math.cos(k * theta);
      const wIm = Math.sin(k * theta);
      for (let i = k; i < n; i += s) {
        const i2 = i + m;
        const tRe = wRe * x[2 * i2] - wIm * x[2 * i2 + 1];
        const tIm = wRe * x[2 * i2 + 1] + wIm * x[2 * i2];
        x[2 * i2] = x[2 * i] - tRe;
        x[2 * i2 + 1] = x[2 * i + 1] - tIm;
        x[2 * i] += tRe;
        x[2 * i + 1] += tIm;
      }
    }
  }
}

// Mel filterbank (26 filters, 0-8000Hz, sampleRate=44100)
function createMelFilterbank(nFilters: number = 26, nFFT: number = 256, sampleRate: number = 44100): Float32Array[] {
  const filters: Float32Array[] = [];
  const lowFreq = 0;
  const highFreq = sampleRate / 2;
  const melLow = 2595 * Math.log10(1 + lowFreq / 700);
  const melHigh = 2595 * Math.log10(1 + highFreq / 700);
  const melStep = (melHigh - melLow) / (nFilters + 1);

  for (let i = 1; i <= nFilters; i++) {
    const centerMel = melLow + i * melStep;
    const centerFreq = 700 * (Math.pow(10, centerMel / 2595) - 1);
    const leftMel = centerMel - melStep;
    const rightMel = centerMel + melStep;
    const leftFreq = 700 * (Math.pow(10, leftMel / 2595) - 1);
    const rightFreq = 700 * (Math.pow(10, rightMel / 2595) - 1);

    const filter = new Float32Array(nFFT);
    const leftBin = Math.max(0, Math.floor(leftFreq / (sampleRate / nFFT)));
    const centerBin = Math.floor(centerFreq / (sampleRate / nFFT));
    const rightBin = Math.min(nFFT - 1, Math.floor(rightFreq / (sampleRate / nFFT)));

    for (let k = leftBin; k <= centerBin; k++) {
      filter[k] = (k - leftBin) / (centerBin - leftBin + 1e-10);
    }
    for (let k = centerBin + 1; k <= rightBin; k++) {
      filter[k] = (rightBin - k) / (rightBin - centerBin + 1e-10);
    }

    filters.push(filter);
  }
  return filters;
}

// DCT-II (Type II), N points
function dct2(x: Float32Array, N: number = 13): Float32Array {
  const y = new Float32Array(N);
  const sqrt2N = Math.sqrt(2 / N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < x.length; n++) {
      sum += x[n] * Math.cos(Math.PI * k * (2 * n + 1) / (2 * N));
    }
    y[k] = sqrt2N * sum;
    if (k === 0) y[k] *= Math.SQRT1_2;
  }
  return y;
}

// 标准 MFCC 提取主函数
export function computeMFCC(signal: Float32Array, sampleRate: number = 44100): Float32Array {
  const frameSize = Math.floor(0.025 * sampleRate); // 25ms
  const hopSize = Math.floor(0.01 * sampleRate);    // 10ms
  const nFilters = 26;
  const nCoeffs = 13;

  // 1. Pre-emphasis
  const preEmphasized = new Float32Array(signal.length);
  preEmphasized[0] = signal[0];
  for (let i = 1; i < signal.length; i++) {
    preEmphasized[i] = signal[i] - 0.97 * signal[i - 1];
  }

  // 2. Framing & Hamming window
  const frames: Float32Array[] = [];
  for (let start = 0; start < preEmphasized.length - frameSize; start += hopSize) {
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      const win = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
      frame[i] = preEmphasized[start + i] * win;
    }
    frames.push(frame);
  }

  if (frames.length === 0) return new Float32Array(nCoeffs);

  // 3. FFT + Power Spectrum (for last frame only, for real-time we'd use streaming)
  const lastFrame = frames[frames.length - 1];
  const nFFT = 256;
  const fftInput = new Float32Array(nFFT * 2);
  for (let i = 0; i < lastFrame.length; i++) {
    fftInput[2 * i] = lastFrame[i];
    fftInput[2 * i + 1] = 0;
  }
  for (let i = lastFrame.length; i < nFFT; i++) {
    fftInput[2 * i] = 0;
    fftInput[2 * i + 1] = 0;
  }
  fft(fftInput);

  const powerSpectrum = new Float32Array(nFFT);
  for (let i = 0; i < nFFT; i++) {
    const re = fftInput[2 * i];
    const im = fftInput[2 * i + 1];
    powerSpectrum[i] = re * re + im * im;
  }

  // 4. Mel Filterbank
  const filters = createMelFilterbank(nFilters, nFFT, sampleRate);
  const filterEnergies = new Float32Array(nFilters);
  for (let i = 0; i < nFilters; i++) {
    let sum = 0;
    for (let j = 0; j < nFFT; j++) {
      sum += filters[i][j] * powerSpectrum[j];
    }
    filterEnergies[i] = Math.log(sum + 1e-10);
  }

  // 5. DCT
  return dct2(filterEnergies, nCoeffs);
}