// AudioWorklet 处理器
// 核心目的：进行实时音频处理，包括降噪、声纹提取和增益补偿

class SonicSenseProcessor extends AudioWorkletProcessor {
  private gain: number = 1.0;
  private targetRMS: number = 0.1; // 目标 RMS 水平
  private currentRMS: number = 0.0;

  constructor() {
    super();
    console.log('SonicSense AudioWorklet Processor initialized');

    // 监听来自主线程的参数更新
    this.port.onmessage = (event) => {
      if (event.data.type === 'setGain') {
        this.gain = event.data.value;
      }
      if (event.data.type === 'setTargetRMS') {
        this.targetRMS = event.data.value;
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];

      // 计算当前 RMS
      let sum = 0;
      for (let i = 0; i < inputChannel.length; i++) {
        sum += inputChannel[i] * inputChannel[i];
      }
      this.currentRMS = Math.sqrt(sum / inputChannel.length);

      // 计算增益补偿: V_out = V_in * (Target_RMS / Current_RMS)
      const compensationGain = this.currentRMS > 0 ? this.targetRMS / this.currentRMS : 1.0;
      const totalGain = this.gain * compensationGain;

      // 应用增益
      for (let i = 0; i < inputChannel.length; i++) {
        outputChannel[i] = inputChannel[i] * totalGain;
      }

      // TODO: 实现声纹特征提取和 AI 推理
      // TODO: 添加降噪算法
    }

    return true;
  }
}

registerProcessor('sonic-sense-processor', SonicSenseProcessor);