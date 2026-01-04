import type { ExtractedContent } from '@/types';
import { detectMainContent } from './content-detector';
import { mapContentElements } from './element-mapper';
import { logger } from '@/utils/logger';

export { detectMainContent } from './content-detector';
export { mapContentElements, getElementBySelector, highlightElement } from './element-mapper';

/**
 * 提取当前页面的教学内容
 */
export function extractPageContent(): ExtractedContent | null {
  logger.info('开始提取页面内容');

  // 1. 检测主内容区域
  const mainContent = detectMainContent();
  if (!mainContent) {
    logger.warn('未能检测到主内容区域');
    return null;
  }

  logger.debug('检测到主内容区域', { selector: mainContent.tagName });

  // 2. 映射内容元素
  const elements = mapContentElements(mainContent);
  logger.info(`提取到 ${elements.length} 个内容元素`);

  // 3. 提取原始文本
  const rawText = mainContent.textContent?.trim() || '';

  // 4. 获取页面标题
  const title = document.title || document.querySelector('h1')?.textContent?.trim() || 'Untitled';

  return {
    url: window.location.href,
    title,
    elements,
    rawText,
  };
}

/**
 * 生成用于AI的内容摘要
 * 将提取的内容转换为适合发送给AI的格式
 */
export function generateContentSummary(content: ExtractedContent): string {
  const parts: string[] = [
    `# ${content.title}`,
    `URL: ${content.url}`,
    '',
    '## 内容结构',
    '',
  ];

  for (const element of content.elements) {
    switch (element.type) {
      case 'heading':
        const prefix = '#'.repeat(element.level || 2);
        parts.push(`${prefix} ${element.content}`);
        break;
      case 'code':
        parts.push('```');
        parts.push(element.content);
        parts.push('```');
        break;
      case 'list':
        parts.push(element.content);
        break;
      case 'image':
        parts.push(`[图片: ${element.content}]`);
        break;
      case 'blockquote':
        parts.push(`> ${element.content}`);
        break;
      default:
        parts.push(element.content);
    }
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * 获取页面基本信息
 */
export function getPageInfo(): { url: string; title: string; hostname: string } {
  return {
    url: window.location.href,
    title: document.title,
    hostname: window.location.hostname,
  };
}
