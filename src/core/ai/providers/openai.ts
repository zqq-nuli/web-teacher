import type { LessonPlan, ExtractedContent, AISettings, LessonStep } from '@/types';
import type { AIProvider, ChatMessage } from './base';
import { LESSON_PLAN_SYSTEM_PROMPT, generateLessonPlanPrompt, CHAT_SYSTEM_PROMPT, generateChatPrompt } from '../prompts';
import { logger } from '@/utils/logger';

/**
 * OpenAI API Provider
 * 兼容 OpenAI 协议格式的 API
 */
export class OpenAIProvider implements AIProvider {
  private getBaseUrl(settings: AISettings): string {
    return settings.baseUrl || 'https://api.openai.com/v1';
  }

  private async makeRequest(
    endpoint: string,
    body: object,
    settings: AISettings
  ): Promise<Response> {
    const baseUrl = this.getBaseUrl(settings);
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    return response;
  }

  async generateLessonPlan(content: ExtractedContent, settings: AISettings): Promise<LessonPlan> {
    logger.info('使用 OpenAI 生成教案');

    const messages: ChatMessage[] = [
      { role: 'system', content: LESSON_PLAN_SYSTEM_PROMPT },
      { role: 'user', content: generateLessonPlanPrompt(content) },
    ];

    const response = await this.makeRequest('/chat/completions', {
      model: settings.model,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }, settings);

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responseContent);
    } catch {
      logger.error('Failed to parse OpenAI response as JSON');
      throw new Error('Invalid JSON response from OpenAI');
    }

    // 转换为 LessonPlan 格式
    const lessonPlan: LessonPlan = {
      id: `lesson-${Date.now()}`,
      url: content.url,
      title: String(parsed.title || content.title),
      createdAt: Date.now(),
      steps: (Array.isArray(parsed.steps) ? parsed.steps : []).map((step: Record<string, unknown>, index: number): LessonStep => ({
        id: String(step.id || `step-${index + 1}`),
        order: Number(step.order) || index + 1,
        title: String(step.title || `步骤 ${index + 1}`),
        content: String(step.content || ''),
        targetSelector: typeof step.targetElementIndex === 'number'
          ? content.elements[step.targetElementIndex]?.selector
          : undefined,
        highlightType: (['element', 'section', 'modal'].includes(String(step.highlightType))
          ? String(step.highlightType)
          : 'element') as LessonStep['highlightType'],
        popoverPosition: (['top', 'bottom', 'left', 'right'].includes(String(step.popoverPosition))
          ? String(step.popoverPosition)
          : 'bottom') as LessonStep['popoverPosition'],
      })),
      metadata: {
        estimatedTime: Number((parsed.metadata as Record<string, unknown>)?.estimatedTime) || 10,
        difficulty: (['beginner', 'intermediate', 'advanced'].includes(String((parsed.metadata as Record<string, unknown>)?.difficulty))
          ? String((parsed.metadata as Record<string, unknown>)?.difficulty)
          : 'beginner') as LessonPlan['metadata']['difficulty'],
        keywords: Array.isArray((parsed.metadata as Record<string, unknown>)?.keywords)
          ? ((parsed.metadata as Record<string, unknown>).keywords as string[]).map(String)
          : [],
      },
    };

    logger.info(`生成了 ${lessonPlan.steps.length} 个教学步骤`);
    return lessonPlan;
  }

  async chat(message: string, context: string, settings: AISettings): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      { role: 'user', content: generateChatPrompt(message, context) },
    ];

    const response = await this.makeRequest('/chat/completions', {
      model: settings.model,
      messages,
      temperature: 0.7,
    }, settings);

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
