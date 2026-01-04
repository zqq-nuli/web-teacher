import type { TTSSettings } from '@/types';

/**
 * TTS Provider 接口
 */
export interface TTSProvider {
  /**
   * 朗读文本
   */
  speak(text: string, settings: TTSSettings): Promise<void>;

  /**
   * 停止朗读
   */
  stop(): void;

  /**
   * 暂停朗读
   */
  pause(): void;

  /**
   * 恢复朗读
   */
  resume(): void;

  /**
   * 是否正在朗读
   */
  isSpeaking(): boolean;

  /**
   * 是否已暂停
   */
  isPaused(): boolean;

  /**
   * 获取可用的语音列表
   */
  getVoices(): Promise<TTSVoice[]>;
}

/**
 * 语音信息
 */
export interface TTSVoice {
  id: string;
  name: string;
  lang: string;
  default?: boolean;
}

/**
 * TTS 事件
 */
export interface TTSEvents {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
  onBoundary?: (charIndex: number, charLength: number) => void;
}
