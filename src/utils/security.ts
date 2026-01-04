/**
 * 简单的速率限制器
 * 确保两次调用之间有最小间隔
 */
export class RateLimiter {
  private lastCallTime = 0;
  private readonly minInterval: number;

  /**
   * @param minInterval 最小调用间隔（毫秒）
   */
  constructor(minInterval: number = 3000) {
    this.minInterval = minInterval;
  }

  /**
   * 执行带速率限制的异步操作
   */
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      await this.delay(waitTime);
    }

    this.lastCallTime = Date.now();
    return fn();
  }

  /**
   * 检查是否可以立即调用
   */
  canCall(): boolean {
    return Date.now() - this.lastCallTime >= this.minInterval;
  }

  /**
   * 获取下次可调用的等待时间（毫秒）
   */
  getWaitTime(): number {
    const timeSinceLastCall = Date.now() - this.lastCallTime;
    return Math.max(0, this.minInterval - timeSinceLastCall);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 内容清理工具
 * 用于清理和验证来自外部的内容
 */
export function sanitizeText(
  text: unknown,
  options: { maxLength?: number; defaultValue?: string } = {}
): string {
  const { maxLength = 10000, defaultValue = '' } = options;

  if (typeof text !== 'string') {
    return defaultValue;
  }

  // 移除潜在的危险字符
  let sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除 script 标签
    .replace(/on\w+\s*=/gi, '')  // 移除事件处理器
    .replace(/javascript:/gi, '') // 移除 javascript: 协议
    .trim();

  // 长度限制
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }

  return sanitized || defaultValue;
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * 验证 API Key 格式
 */
export function isValidApiKey(key: string, provider: 'openai' | 'anthropic'): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  if (provider === 'openai') {
    // OpenAI API Key 格式: sk-...
    return /^sk-[A-Za-z0-9]{20,}$/.test(key);
  } else if (provider === 'anthropic') {
    // Anthropic API Key 格式: sk-ant-...
    return /^sk-ant-[A-Za-z0-9\-_]{20,}$/.test(key);
  }

  return false;
}
