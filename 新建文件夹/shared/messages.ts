// 类型定义、常量与通讯协议

// ============ 音频流相关消息 ============

export interface AudioStreamMessage {
  type: 'audio_stream';
  streamId: string;
  data: MediaStream;
}

export interface AudioStreamStartedMessage {
  type: 'audio_stream_started';
  streamId: string;
  timestamp: number;
}

export interface AudioStreamStoppedMessage {
  type: 'audio_stream_stopped';
  streamId: string;
  timestamp: number;
}

// ============ 音频处理相关消息 ============

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

// ============ 声纹特征相关消息 ============

export interface VoicePrintMessage {
  type: 'voice_print';
  streamId: string;
  mfcc: number[];       // 13 个 MFCC 系数
  pitch: number;        // 估计的音高 (Hz)
  energyBands: number[]; // 8 个频段能量
  rms: number;          // 当前 RMS 水平
  timestamp: number;
}

export interface VoicePrintCalibrationRequest {
  type: 'voice_print_calibration';
  duration: number; // 校准时长 (秒)
}

export interface VoicePrintCalibrationResult {
  type: 'voice_print_calibration_result';
  success: boolean;
  voicePrint?: number[]; // 校准后的声纹特征
  error?: string;
}

// ============ 音频分析相关消息 ============

export interface AudioAnalysisMessage {
  type: 'audio_analysis';
  rms: number;
  spectrum: number[];
  gain: number;
  timestamp: number;
}

// ============ 降噪控制相关消息 ============

export interface NoiseReductionConfig {
  type: 'noise_reduction_config';
  enabled: boolean;
  noiseProfile?: number[];
  threshold?: number;
}

export interface NoiseReductionStatus {
  type: 'noise_reduction_status';
  enabled: boolean;
  noiseProfileLearned: boolean;
}

// ============ 播放控制相关消息 ============

export interface PlayControlMessage {
  type: 'play_control';
  action: 'start' | 'stop' | 'pause' | 'resume';
  streamId?: string;
}

export interface PlayStatusMessage {
  type: 'play_status';
  isPlaying: boolean;
  isPaused: boolean;
  streamId?: string;
}

// ============ 设置相关消息 ============

export interface SettingsUpdateMessage {
  type: 'settings_update';
  settings: {
    targetRMS?: number;
    gain?: number;
    noiseReductionEnabled?: boolean;
    voicePrintEnabled?: boolean;
  };
}

export interface SettingsResponseMessage {
  type: 'settings_response';
  settings: {
    targetRMS: number;
    gain: number;
    noiseReductionEnabled: boolean;
    voicePrintEnabled: boolean;
  };
}

// ============ 错误相关消息 ============

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  details?: any;
}

// ============ 状态相关消息 ============

export interface StatusMessage {
  type: 'status';
  status: 'idle' | 'processing' | 'error' | 'calibrating';
  details?: string;
}

// ============ 主从消息类型 ============

// 从 Content 到 Background 的消息
export type ContentToBackgroundMessage = 
  | AudioStreamMessage
  | AudioStreamStartedMessage
  | AudioStreamStoppedMessage;

// 从 Background 到 Offscreen 的消息
export type BackgroundToOffscreenMessage = 
  | AudioStreamMessage
  | ProcessAudioMessage
  | PlayControlMessage
  | NoiseReductionConfig
  | SettingsUpdateMessage
  | VoicePrintCalibrationRequest;

// 从 Offscreen 到 Background 的消息
export type OffscreenToBackgroundMessage = 
  | AudioProcessedMessage
  | VoicePrintMessage
  | AudioAnalysisMessage
  | PlayStatusMessage
  | NoiseReductionStatus
  | VoicePrintCalibrationResult
  | StatusMessage
  | ErrorMessage;

// 从 Background 到 Content/Popup/Options 的消息
export type BackgroundToUIMessage = 
  | AudioProcessedMessage
  | VoicePrintMessage
  | AudioAnalysisMessage
  | PlayStatusMessage
  | NoiseReductionStatus
  | VoicePrintCalibrationResult
  | SettingsResponseMessage
  | StatusMessage
  | ErrorMessage;

// 所有消息类型的联合
export type Message = 
  | ContentToBackgroundMessage
  | BackgroundToOffscreenMessage
  | OffscreenToBackgroundMessage
  | BackgroundToUIMessage
  | SettingsUpdateMessage
  | PlayControlMessage;

// ============ 常量定义 ============

export const DEFAULT_SETTINGS = {
  targetRMS: 0.1,
  gain: 1.0,
  noiseReductionEnabled: true,
  voicePrintEnabled: true,
  noiseThreshold: 0.02,
  calibrationDuration: 5 // 秒
};

export const AUDIO_CONFIG = {
  sampleRate: 44100,
  fftSize: 256,
  hopSize: 128
};
