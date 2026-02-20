// AudioWorklet 处理器
// 核心目的：进行实时音频处理，包括降噪、声纹提取和增益补偿

interface ProcessorOptions {
  type: 'setGain' | 'setTargetRMS' | 'setNoiseReduction' | 'setVoicePrint';
  value: any;
}

class SonicSenseProcessor extends AudioWorkletProcessor {
  private gain: number = 1.0;
  private targetRMS: number = 0.1; // 目标 RMS 水平
  private currentRMS: number = 0.0;
  
  // 降噪相关
  private noiseReductionEnabled: boolean = true;
  private noiseProfile: Float32Array | null = null;
  private noiseThreshold: number = 0.02;
  private spectralGate: Float32Array = new Float32Array(128);
  
  // 声纹特征提取相关
  private voicePrintEnabled: boolean = true;
  private voicePrintBuffer: Float32Array = new Float32Array(256);
  private voicePrintIndex: number = 0;
  private mfccFeatures: Float32Array = new Float32Array(13); // 13 个 MFCC 系数
  private pitchEstimate: number = 0;
  
  // 音频分析相关
  private fftBuffer: Float32Array = new Float32Array(256);
  private spectrum: Float32Array = new Float32Array(128);
  private energyBands: Float32Array = new Float32Array(8); // 8 个频段能量
  
  // 平滑处理
  private smoothingFactor: number = 0.3;
  private previousOutput: Float32Array = new Float32Array(128);

  constructor() {
    super();
    console.log('SonicSense AudioWorklet Processor initialized');
    
    // 初始化噪声谱
    for (let i = 0; i < this.spectralGate.length; i++) {
      this.spectralGate[i] = this.noiseThreshold;
    }

    // 监听来自主线程的参数更新
    this.port.onmessage = (event: { data: ProcessorOptions }) => {
      const data = event.data;
      switch (data.type) {
        case 'setGain':
          this.gain = data.value;
          break;
        case 'setTargetRMS':
          this.targetRMS = data.value;
          break;
        case 'setNoiseReduction':
          this.noiseReductionEnabled = data.value.enabled;
          if (data.value.noiseProfile) {
            this.noiseProfile = new Float32Array(data.value.noiseProfile);
          }
          break;
        case 'setVoicePrint':
          this.voicePrintEnabled = data.value.enabled;
          break;
      }
    };
  }

  /**
   * 计算信号的 RMS (Root Mean Square)
   */
  private computeRMS(signal: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < signal.length; i++) {
      sum += signal[i] * signal[i];
    }
    return Math.sqrt(sum / signal.length);
  }

  /**
   * 简单的频谱分析 (使用 Goertzel 算法简化版本)
   */
  private computeSpectrum(input: Float32Array): Float32Array {
    // 简化的频谱分析，用于降噪和特征提取
    const output = new Float32Array(this.spectrum.length);
    const hopSize = Math.floor(input.length / this.spectrum.length);
    
    for (let i = 0; i < this.spectrum.length; i++) {
      let sum = 0;
      for (let j = 0; j < hopSize && i * hopSize + j < input.length; j++) {
        sum += Math.abs(input[i * hopSize + j]);
      }
      output[i] = sum / hopSize;
    }
    
    return output;
  }

  /**
   * 谱减法降噪
   */
  private spectralSubtraction(spectrum: Float32Array): Float32Array {
    const output = new Float32Array(spectrum.length);
    
    for (let i = 0; i < spectrum.length; i++) {
      const noiseFloor = this.noiseProfile ? this.noiseProfile[i] : this.noiseThreshold;
      const reduced = Math.max(0, spectrum[i] - noiseFloor * 2);
      // 平滑处理避免音乐噪声
      output[i] = this.smoothingFactor * reduced + (1 - this.smoothingFactor) * spectrum[i];
    }
    
    return output;
  }

  /**
   * 谱门限降噪
   */
  private spectralGate(input: Float32Array): Float32Array {
    const output = new Float32Array(input.length);
    const spectrum = this.computeSpectrum(input);
    const gatedSpectrum = new Float32Array(spectrum.length);
    
    // 应用谱门
    for (let i = 0; i < spectrum.length; i++) {
      const threshold = this.spectralGate[i % this.spectralGate.length];
      gatedSpectrum[i] = spectrum[i] > threshold ? spectrum[i] : 0;
    }
    
    // 简化的重建 (实际应该使用逆 FFT)
    let outputIndex = 0;
    for (let i = 0; i < input.length && outputIndex < input.length; i++) {
      const bandIndex = Math.floor(i / (input.length / spectrum.length));
      output[outputIndex++] = input[i] * (gatedSpectrum[bandIndex] > 0 ? 1 : 0.1);
    }
    
    return output;
  }

  /**
   * 提取 MFCC 特征 (标准版)
   * 流程: Pre-emphasis → Framing → Hamming → FFT → Mel Filterbank → Log → DCT-II
   */
  private extractMFCC(inputSignal: Float32Array, sampleRate: number = 44100): Float32Array {
    const frameSize = Math.floor(0.025 * sampleRate); // 25ms
    const hopSize = Math.floor(0.01 * sampleRate);    // 10ms
    const nFilters = 26;
    const nCoeffs = 13;

    // 1. Pre-emphasis
    const preEmphasized = new Float32Array(inputSignal.length);
    preEmphasized[0] = inputSignal[0];
    for (let i = 1; i < inputSignal.length; i++) {
      preEmphasized[i] = inputSignal[i] - 0.97 * inputSignal[i - 1];
    }

    // 2. Framing & Hamming window (use last frame for real-time)
    let frameStart = Math.max(0, inputSignal.length - frameSize);
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      const idx = frameStart + i;
      const win = idx < inputSignal.length 
        ? 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1))
        : 0;
      frame[i] = (idx < inputSignal.length ? preEmphasized[idx] : 0) * win;
    }

    // 3. FFT (Radix-2, in-place complex)
    const nFFT = 256;
    const fftInput = new Float32Array(nFFT * 2);
    for (let i = 0; i < frameSize; i++) {
      fftInput[2 * i] = frame[i];
      fftInput[2 * i + 1] = 0;
    }
    for (let i = frameSize; i < nFFT; i++) {
      fftInput[2 * i] = 0;
      fftInput[2 * i + 1] = 0;
    }

    // Bit-reversal
    let j = 0;
    for (let i = 1; i < nFFT; i++) {
      let bit = nFFT >> 1;
      while (j & bit) {
        j ^= bit;
        bit >>= 1;
      }
      j ^= bit;
      if (i < j) {
        [fftInput[2 * i], fftInput[2 * j]] = [fftInput[2 * j], fftInput[2 * i]];
        [fftInput[2 * i + 1], fftInput[2 * j + 1]] = [fftInput[2 * j + 1], fftInput[2 * i + 1]];
      }
    }

    // Butterfly
    for (let s = 2; s <= nFFT; s *= 2) {
      const m = s / 2;
      const theta = -2 * Math.PI / s;
      for (let k = 0; k < m; k++) {
        const wRe = Math.cos(k * theta);
        const wIm = Math.sin(k * theta);
        for (let i = k; i < nFFT; i += s) {
          const i2 = i + m;
          const tRe = wRe * fftInput[2 * i2] - wIm * fftInput[2 * i2 + 1];
          const tIm = wRe * fftInput[2 * i2 + 1] + wIm * fftInput[2 * i2];
          fftInput[2 * i2] = fftInput[2 * i] - tRe;
          fftInput[2 * i2 + 1] = fftInput[2 * i + 1] - tIm;
          fftInput[2 * i] += tRe;
          fftInput[2 * i + 1] += tIm;
        }
      }
    }

    // Power Spectrum
    const powerSpectrum = new Float32Array(nFFT);
    for (let i = 0; i < nFFT; i++) {
      const re = fftInput[2 * i];
      const im = fftInput[2 * i + 1];
      powerSpectrum[i] = re * re + im * im;
    }

    // 4. Mel Filterbank (26 filters, 0-8000Hz)
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

    // 5. Filter energies & log
    const filterEnergies = new Float32Array(nFilters);
    for (let i = 0; i < nFilters; i++) {
      let sum = 0;
      for (let j = 0; j < nFFT; j++) {
        sum += filters[i][j] * powerSpectrum[j];
      }
      filterEnergies[i] = Math.log(sum + 1e-10);
    }

    // 6. DCT-II (13 coefficients)
    for (let k = 0; k < nCoeffs; k++) {
      let sum = 0;
      for (let n = 0; n < nFilters; n++) {
        sum += filterEnergies[n] * Math.cos(Math.PI * k * (2 * n + 1) / (2 * nFilters));
      }
      this.mfccFeatures[k] = sum * Math.sqrt(2 / nFilters);
      if (k === 0) this.mfccFeatures[k] *= Math.SQRT1_2;
    }

    return this.mfccFeatures;
  }

  /**
   * 音高估计 (使用自相关方法)
   */
  private estimatePitch(input: Float32Array, sampleRate: number): number {
    const bufferSize = input.length;
    let maxCorrelation = 0;
    let bestLag = 0;
    
    // 计算自相关
    for (let lag = 2; lag < bufferSize / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < bufferSize - lag; i++) {
        correlation += input[i] * input[i + lag];
      }
      correlation = Math.abs(correlation);
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }
    
    // 转换为频率
    if (bestLag > 0) {
      this.pitchEstimate = sampleRate / bestLag;
    }
    
    return this.pitchEstimate;
  }

  /**
   * 计算频段能量
   */
  private computeEnergyBands(spectrum: Float32Array): Float32Array {
    const bandsPerOctave = Math.floor(spectrum.length / 8);
    
    for (let i = 0; i < 8; i++) {
      let sum = 0;
      const start = i * bandsPerOctave;
      const end = Math.min((i + 1) * bandsPerOctave, spectrum.length);
      for (let j = start; j < end; j++) {
        sum += spectrum[j] * spectrum[j];
      }
      this.energyBands[i] = sum / (end - start);
    }
    
    return this.energyBands;
  }

  /**
   * 更新声纹缓冲区
   */
  private updateVoicePrint(features: Float32Array) {
    for (let i = 0; i < features.length && this.voicePrintIndex < this.voicePrintBuffer.length; i++) {
      this.voicePrintBuffer[this.voicePrintIndex++] = features[i];
    }
    if (this.voicePrintIndex >= this.voicePrintBuffer.length) {
      this.voicePrintIndex = 0;
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];
      const sampleRate = sampleRate || 44100;

      // 1. 计算当前 RMS
      this.currentRMS = this.computeRMS(inputChannel);

      // 2. 频谱分析
      this.spectrum = this.computeSpectrum(inputChannel);

      // 3. 降噪处理
      let processedSignal = inputChannel;
      if (this.noiseReductionEnabled) {
        // 更新噪声谱 (在静音期间)
        if (this.currentRMS < this.noiseThreshold && !this.noiseProfile) {
          this.noiseProfile = new Float32Array(this.spectrum);
        }
        
        // 应用谱门降噪
        processedSignal = this.spectralGate(inputChannel);
        
        // 重新计算降噪后的频谱
        this.spectrum = this.computeSpectrum(processedSignal);
      }

      // 4. 计算增益补偿: V_out = V_in * (Target_RMS / Current_RMS)
      const compensationGain = this.currentRMS > 0 ? this.targetRMS / this.currentRMS : 1.0;
      const totalGain = this.gain * compensationGain;

      // 5. 应用增益并限制输出范围
      for (let i = 0; i < inputChannel.length; i++) {
        let value = processedSignal[i] * totalGain;
        // 软限幅
        if (value > 1.0) {
          value = 1.0 - (1.0 - value) / (1.0 + Math.abs(value));
        } else if (value < -1.0) {
          value = -1.0 - (-1.0 - value) / (1.0 + Math.abs(value));
        }
        outputChannel[i] = value;
      }

      // 6. 声纹特征提取
      if (this.voicePrintEnabled) {
        const mfcc = this.extractMFCC(inputChannel, sampleRate);
        this.pitchEstimate = this.estimatePitch(inputChannel, sampleRate);
        // 重计算 energyBands from power spectrum (optional, for now reuse old)
        this.energyBands = this.computeEnergyBands(this.spectrum);
        this.updateVoicePrint(mfcc);

        // 发送特征数据到主线程 (定期发送，避免过多消息)
        if (this.voicePrintIndex % 128 === 0) {
          this.port.postMessage({
            type: 'voicePrint',
            mfcc: Array.from(mfcc),
            pitch: this.pitchEstimate,
            energyBands: Array.from(this.energyBands),
            rms: this.currentRMS
          });
        }
      }

      // 7. 发送音频分析数据到主线程用于 UI 显示
      this.port.postMessage({
        type: 'audioAnalysis',
        rms: this.currentRMS,
        spectrum: Array.from(this.spectrum.slice(0, 32)), // 只发送部分频谱数据
        gain: totalGain
      });
    }

    return true;
  }
}

registerProcessor('sonic-sense-processor', SonicSenseProcessor);
