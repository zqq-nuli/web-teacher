import type { LessonPlan, ExtractedContent, AISettings } from '@/types';
import type { AIProvider, AIResponse } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { RateLimiter, sanitizeText } from '@/utils/security';
import { logger } from '@/utils/logger';

export type { AIProvider, AIResponse } from './providers/base';

// Provider 实例缓存
const providers: Record<string, AIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
};

// 速率限制器 - 最少 3 秒间隔
const rateLimiter = new RateLimiter(3000);

// 内容长度限制
const MAX_STEP_TITLE_LENGTH = 200;
const MAX_STEP_CONTENT_LENGTH = 2000;
const MAX_STEPS = 50;

/**
 * 获取 AI Provider
 */
export function getAIProvider(providerName: string): AIProvider {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown AI provider: ${providerName}`);
  }
  return provider;
}

/**
 * 清理教案内容
 */
function sanitizeLessonPlan(lessonPlan: LessonPlan): LessonPlan {
  return {
    ...lessonPlan,
    title: sanitizeText(lessonPlan.title, { maxLength: MAX_STEP_TITLE_LENGTH }),
    steps: lessonPlan.steps.slice(0, MAX_STEPS).map(step => ({
      ...step,
      title: sanitizeText(step.title, { maxLength: MAX_STEP_TITLE_LENGTH }),
      content: sanitizeText(step.content, { maxLength: MAX_STEP_CONTENT_LENGTH }),
    })),
  };
}

/**
 * 生成教案
 */
export async function generateLessonPlan(
  content: ExtractedContent,
  settings: AISettings
): Promise<AIResponse<LessonPlan>> {
  try {
    // 应用速率限制
    return await rateLimiter.throttle(async () => {
      const provider = getAIProvider(settings.provider);
      const lessonPlan = await provider.generateLessonPlan(content, settings);

      // 清理返回的内容
      const sanitizedPlan = sanitizeLessonPlan(lessonPlan);

      return { success: true, data: sanitizedPlan };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('生成教案失败', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * AI 对话
 */
export async function chat(
  message: string,
  context: string,
  settings: AISettings
): Promise<AIResponse<string>> {
  try {
    const provider = getAIProvider(settings.provider);
    const response = await provider.chat(message, context, settings);
    return { success: true, data: response };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('AI对话失败', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 验证 API Key 是否有效
 */
export async function validateApiKey(settings: AISettings): Promise<boolean> {
  try {
    // 发送一个简单的请求来验证 API Key
    const provider = getAIProvider(settings.provider);
    await provider.chat('Hi', 'Test', settings);
    return true;
  } catch {
    return false;
  }
}
