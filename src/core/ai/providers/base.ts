import type { LessonPlan, ExtractedContent, AISettings } from '@/types';

/**
 * AI Provider 接口
 */
export interface AIProvider {
  generateLessonPlan(content: ExtractedContent, settings: AISettings): Promise<LessonPlan>;
  chat(message: string, context: string, settings: AISettings): Promise<string>;
}

/**
 * AI 响应类型
 */
export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 通用的流式消息类型
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
