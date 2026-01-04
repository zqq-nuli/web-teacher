import type { LessonPlan, ExtractedContent, AISettings, LessonStep } from '@/types';
import type { AIProvider } from './base';
import { LESSON_PLAN_SYSTEM_PROMPT, generateLessonPlanPrompt, CHAT_SYSTEM_PROMPT, generateChatPrompt } from '../prompts';
import { logger } from '@/utils/logger';

/**
 * Anthropic API Provider
 */
export class AnthropicProvider implements AIProvider {
  private getBaseUrl(settings: AISettings): string {
    return settings.baseUrl || 'https://api.anthropic.com';
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
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    return response;
  }

  async generateLessonPlan(content: ExtractedContent, settings: AISettings): Promise<LessonPlan> {
    logger.info('使用 Anthropic 生成教案');

    const response = await this.makeRequest('/v1/messages', {
      model: settings.model,
      max_tokens: 4096,
      system: LESSON_PLAN_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: generateLessonPlanPrompt(content) },
      ],
    }, settings);

    const data = await response.json();
    const responseContent = data.content?.[0]?.text;

    if (!responseContent) {
      throw new Error('Empty response from Anthropic');
    }

    // 提取 JSON（Anthropic 可能会在 JSON 前后添加文本）
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 转换为 LessonPlan 格式
    const lessonPlan: LessonPlan = {
      id: `lesson-${Date.now()}`,
      url: content.url,
      title: parsed.title || content.title,
      createdAt: Date.now(),
      steps: (parsed.steps || []).map((step: any, index: number): LessonStep => ({
        id: step.id || `step-${index + 1}`,
        order: step.order || index + 1,
        title: step.title || `步骤 ${index + 1}`,
        content: step.content || '',
        targetSelector: content.elements[step.targetElementIndex]?.selector,
        highlightType: step.highlightType || 'element',
        popoverPosition: step.popoverPosition || 'bottom',
      })),
      metadata: {
        estimatedTime: parsed.metadata?.estimatedTime || 10,
        difficulty: parsed.metadata?.difficulty || 'beginner',
        keywords: parsed.metadata?.keywords || [],
      },
    };

    logger.info(`生成了 ${lessonPlan.steps.length} 个教学步骤`);
    return lessonPlan;
  }

  async chat(message: string, context: string, settings: AISettings): Promise<string> {
    const response = await this.makeRequest('/v1/messages', {
      model: settings.model,
      max_tokens: 2048,
      system: CHAT_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: generateChatPrompt(message, context) },
      ],
    }, settings);

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }
}
