import type { LessonPlan, ExtractedContent, LessonStep } from '@/types';

/**
 * 解析 AI 响应并转换为 LessonPlan 格式
 * 提取自 OpenAI 和 Anthropic 提供者的公共代码
 */
export function parseLessonPlanResponse(
  parsed: Record<string, unknown>,
  content: ExtractedContent
): LessonPlan {
  return {
    id: `lesson-${Date.now()}`,
    url: content.url,
    title: String(parsed.title || content.title),
    createdAt: Date.now(),
    steps: parseSteps(parsed.steps, content),
    metadata: parseMetadata(parsed.metadata),
  };
}

/**
 * 解析步骤数组
 */
function parseSteps(
  steps: unknown,
  content: ExtractedContent
): LessonStep[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((step: Record<string, unknown>, index: number): LessonStep => ({
    id: String(step.id || `step-${index + 1}`),
    order: Number(step.order) || index + 1,
    title: String(step.title || `步骤 ${index + 1}`),
    content: String(step.content || ''),
    targetSelector: typeof step.targetElementIndex === 'number'
      ? content.elements[step.targetElementIndex]?.selector
      : undefined,
    highlightType: parseHighlightType(step.highlightType),
    popoverPosition: parsePopoverPosition(step.popoverPosition),
  }));
}

/**
 * 解析元数据
 */
function parseMetadata(
  metadata: unknown
): LessonPlan['metadata'] {
  const meta = (metadata as Record<string, unknown>) || {};

  return {
    estimatedTime: Number(meta.estimatedTime) || 10,
    difficulty: parseDifficulty(meta.difficulty),
    keywords: parseKeywords(meta.keywords),
  };
}

/**
 * 解析高亮类型
 */
function parseHighlightType(
  value: unknown
): LessonStep['highlightType'] {
  const validTypes = ['element', 'section', 'modal'];
  const strValue = String(value);
  return validTypes.includes(strValue)
    ? (strValue as LessonStep['highlightType'])
    : 'element';
}

/**
 * 解析弹出位置
 */
function parsePopoverPosition(
  value: unknown
): LessonStep['popoverPosition'] {
  const validPositions = ['top', 'bottom', 'left', 'right'];
  const strValue = String(value);
  return validPositions.includes(strValue)
    ? (strValue as LessonStep['popoverPosition'])
    : 'bottom';
}

/**
 * 解析难度
 */
function parseDifficulty(
  value: unknown
): LessonPlan['metadata']['difficulty'] {
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];
  const strValue = String(value);
  return validDifficulties.includes(strValue)
    ? (strValue as LessonPlan['metadata']['difficulty'])
    : 'beginner';
}

/**
 * 解析关键词
 */
function parseKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(String);
}
