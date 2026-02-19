// 类型定义、常量与通讯协议

export interface AudioStreamMessage {
  type: 'audio_stream';
  streamId: string;
  data: MediaStream;
}

export interface ProcessAudioMessage {
  type: 'process_audio';
  streamId: string;
  audioData: Float32Array;
}

export interface AudioProcessedMessage {
  type: 'audio_processed';
  streamId: string;
  processedData: Float32Array;
}

export type Message = AudioStreamMessage | ProcessAudioMessage | AudioProcessedMessage;