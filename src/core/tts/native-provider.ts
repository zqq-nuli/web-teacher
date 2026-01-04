import type { TTSProvider, TTSVoice, TTSEvents } from './base';
import type { TTSSettings } from '@/types';
import { logger } from '@/utils/logger';

/**
 * 浏览器原生 TTS Provider
 * 使用 Web Speech API
 */
export class NativeTTSProvider implements TTSProvider {
  private utterance: SpeechSynthesisUtterance | null = null;
  private speaking = false;
  private paused = false;
  private events: TTSEvents = {};
  private voicesLoaded = false;
  private voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

  constructor(events?: TTSEvents) {
    if (events) {
      this.events = events;
    }

    // 确保语音列表加载
    this.loadVoices();
  }

  /**
   * 加载语音列表
   */
  private loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (this.voicesPromise) {
      return this.voicesPromise;
    }

    this.voicesPromise = new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();

      if (voices.length > 0) {
        this.voicesLoaded = true;
        resolve(voices);
        return;
      }

      // 有些浏览器需要等待 voiceschanged 事件
      speechSynthesis.onvoiceschanged = () => {
        this.voicesLoaded = true;
        resolve(speechSynthesis.getVoices());
      };

      // 超时处理
      setTimeout(() => {
        if (!this.voicesLoaded) {
          resolve(speechSynthesis.getVoices());
        }
      }, 1000);
    });

    return this.voicesPromise;
  }

  /**
   * 朗读文本
   */
  async speak(text: string, settings: TTSSettings): Promise<void> {
    // 停止当前朗读
    this.stop();

    if (!text.trim()) {
      return;
    }

    // 确保语音已加载
    await this.loadVoices();

    return new Promise((resolve, reject) => {
      try {
        this.utterance = new SpeechSynthesisUtterance(text);

        // 设置语速
        this.utterance.rate = settings.rate;

        // 设置语音
        if (settings.voice) {
          const voices = speechSynthesis.getVoices();
          const voice = voices.find(v => v.name === settings.voice || v.voiceURI === settings.voice);
          if (voice) {
            this.utterance.voice = voice;
          } else {
            // 尝试找一个中文语音
            const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
            if (chineseVoice) {
              this.utterance.voice = chineseVoice;
            }
          }
        } else {
          // 默认尝试使用中文语音
          const voices = speechSynthesis.getVoices();
          const chineseVoice = voices.find(v => v.lang.startsWith('zh'));
          if (chineseVoice) {
            this.utterance.voice = chineseVoice;
          }
        }

        // 事件处理
        this.utterance.onstart = () => {
          this.speaking = true;
          this.paused = false;
          logger.debug('TTS 开始朗读');
          this.events.onStart?.();
        };

        this.utterance.onend = () => {
          this.speaking = false;
          this.paused = false;
          logger.debug('TTS 朗读结束');
          this.events.onEnd?.();
          resolve();
        };

        this.utterance.onerror = (event) => {
          this.speaking = false;
          this.paused = false;

          // 忽略 interrupted 和 canceled 错误
          if (event.error === 'interrupted' || event.error === 'canceled') {
            resolve();
            return;
          }

          const error = new Error(`TTS 错误: ${event.error}`);
          logger.error('TTS 错误', event.error);
          this.events.onError?.(error);
          reject(error);
        };

        this.utterance.onpause = () => {
          this.paused = true;
          this.events.onPause?.();
        };

        this.utterance.onresume = () => {
          this.paused = false;
          this.events.onResume?.();
        };

        this.utterance.onboundary = (event) => {
          this.events.onBoundary?.(event.charIndex, event.charLength);
        };

        // 开始朗读
        speechSynthesis.speak(this.utterance);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('TTS 未知错误');
        logger.error('TTS 朗读失败', err);
        this.events.onError?.(err);
        reject(err);
      }
    });
  }

  /**
   * 停止朗读
   */
  stop(): void {
    speechSynthesis.cancel();
    this.speaking = false;
    this.paused = false;
    this.utterance = null;
  }

  /**
   * 暂停朗读
   */
  pause(): void {
    if (this.speaking && !this.paused) {
      speechSynthesis.pause();
      this.paused = true;
    }
  }

  /**
   * 恢复朗读
   */
  resume(): void {
    if (this.paused) {
      speechSynthesis.resume();
      this.paused = false;
    }
  }

  /**
   * 是否正在朗读
   */
  isSpeaking(): boolean {
    return this.speaking;
  }

  /**
   * 是否已暂停
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * 获取可用的语音列表
   */
  async getVoices(): Promise<TTSVoice[]> {
    const voices = await this.loadVoices();

    return voices.map(voice => ({
      id: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
    }));
  }

  /**
   * 更新事件回调
   */
  setEvents(events: TTSEvents): void {
    this.events = events;
  }
}
