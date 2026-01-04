import type { TTSProvider, TTSVoice, TTSEvents } from './base';
import type { TTSSettings, TTSProvider as TTSProviderType } from '@/types';
import { NativeTTSProvider } from './native-provider';
import { logger } from '@/utils/logger';

export type { TTSProvider, TTSVoice, TTSEvents } from './base';
export { NativeTTSProvider } from './native-provider';

/**
 * TTS 控制器
 * 管理 TTS 朗读队列和状态
 */
export class TTSController {
  private provider: TTSProvider | null = null;
  private settings: TTSSettings;
  private events: TTSEvents = {};
  private queue: string[] = [];
  private isProcessing = false;

  constructor(settings: TTSSettings, events?: TTSEvents) {
    this.settings = settings;
    if (events) {
      this.events = events;
    }

    this.initProvider();
  }

  /**
   * 初始化 Provider
   */
  private initProvider(): void {
    switch (this.settings.provider) {
      case 'native':
        this.provider = new NativeTTSProvider(this.events);
        break;
      // TODO: 添加其他 provider（如 OpenAI TTS）
      case 'openai':
      case 'azure':
        logger.warn(`TTS Provider "${this.settings.provider}" 尚未实现，使用原生 TTS`);
        this.provider = new NativeTTSProvider(this.events);
        break;
      default:
        this.provider = new NativeTTSProvider(this.events);
    }
  }

  /**
   * 朗读文本
   */
  async speak(text: string): Promise<void> {
    if (!this.settings.enabled || !this.provider) {
      return;
    }

    await this.provider.speak(text, this.settings);
  }

  /**
   * 添加文本到队列并朗读
   */
  async enqueue(text: string): Promise<void> {
    if (!this.settings.enabled) {
      return;
    }

    this.queue.push(text);

    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * 处理朗读队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !this.provider) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const text = this.queue.shift();
      if (text) {
        try {
          await this.speak(text);
        } catch (error) {
          logger.error('TTS 队列处理错误', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * 停止朗读
   */
  stop(): void {
    this.queue = [];
    this.isProcessing = false;
    this.provider?.stop();
  }

  /**
   * 暂停朗读
   */
  pause(): void {
    this.provider?.pause();
  }

  /**
   * 恢复朗读
   */
  resume(): void {
    this.provider?.resume();
  }

  /**
   * 是否正在朗读
   */
  isSpeaking(): boolean {
    return this.provider?.isSpeaking() ?? false;
  }

  /**
   * 是否已暂停
   */
  isPaused(): boolean {
    return this.provider?.isPaused() ?? false;
  }

  /**
   * 获取可用的语音列表
   */
  async getVoices(): Promise<TTSVoice[]> {
    return this.provider?.getVoices() ?? [];
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<TTSSettings>): void {
    const providerChanged = settings.provider && settings.provider !== this.settings.provider;

    this.settings = { ...this.settings, ...settings };

    if (providerChanged) {
      this.stop();
      this.initProvider();
    }
  }

  /**
   * 更新事件回调
   */
  setEvents(events: TTSEvents): void {
    this.events = events;

    if (this.provider instanceof NativeTTSProvider) {
      this.provider.setEvents(events);
    }
  }

  /**
   * 获取当前设置
   */
  getSettings(): TTSSettings {
    return { ...this.settings };
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * 启用/禁用
   */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;

    if (!enabled) {
      this.stop();
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stop();
    this.provider = null;
  }
}

/**
 * 创建 TTS 控制器
 */
export function createTTSController(settings: TTSSettings, events?: TTSEvents): TTSController {
  return new TTSController(settings, events);
}

/**
 * 默认 TTS 设置
 */
export const defaultTTSSettings: TTSSettings = {
  provider: 'native',
  rate: 1.0,
  enabled: false,
};
