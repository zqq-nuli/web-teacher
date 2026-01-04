import type { ExtractedElement, ElementType } from '@/types';

let elementCounter = 0;

/**
 * 重置元素计数器
 */
export function resetElementCounter(): void {
  elementCounter = 0;
}

/**
 * 生成唯一的元素ID
 */
function generateElementId(): string {
  return `wt-el-${++elementCounter}`;
}

/**
 * 为元素生成唯一的CSS选择器
 */
export function generateSelector(element: HTMLElement): string {
  // 如果元素有唯一ID，直接使用
  if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
    return `#${CSS.escape(element.id)}`;
  }

  // 生成路径选择器
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // 添加类名（选择最具特征的类）
    if (current.classList.length > 0) {
      const meaningfulClasses = Array.from(current.classList)
        .filter(c => !c.match(/^(js-|is-|has-)/))
        .slice(0, 2);
      if (meaningfulClasses.length > 0) {
        selector += '.' + meaningfulClasses.join('.');
      }
    }

    // 添加 nth-child 确保唯一性
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        s => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * 判断元素类型
 */
export function getElementType(element: HTMLElement): ElementType {
  const tagName = element.tagName.toLowerCase();

  // 标题
  if (/^h[1-6]$/.test(tagName)) {
    return 'heading';
  }

  // 代码块
  if (tagName === 'pre' || tagName === 'code') {
    return 'code';
  }

  // 列表
  if (tagName === 'ul' || tagName === 'ol' || tagName === 'li') {
    return 'list';
  }

  // 图片
  if (tagName === 'img' || tagName === 'figure') {
    return 'image';
  }

  // 表格
  if (tagName === 'table') {
    return 'table';
  }

  // 引用
  if (tagName === 'blockquote') {
    return 'blockquote';
  }

  // 默认为段落
  return 'paragraph';
}

/**
 * 获取标题层级
 */
function getHeadingLevel(element: HTMLElement): number | undefined {
  const match = element.tagName.match(/^H(\d)$/i);
  return match ? parseInt(match[1]) : undefined;
}

/**
 * 提取元素的文本内容
 */
function extractText(element: HTMLElement): string {
  const type = getElementType(element);

  // 代码块保留原始格式
  if (type === 'code') {
    return element.textContent?.trim() || '';
  }

  // 图片使用alt文本
  if (type === 'image') {
    const img = element.tagName === 'IMG' ? element : element.querySelector('img');
    return (img as HTMLImageElement)?.alt || '[图片]';
  }

  // 其他类型提取纯文本
  return element.textContent?.trim() || '';
}

/**
 * 映射单个元素
 */
export function mapElement(element: HTMLElement, index: number): ExtractedElement {
  const type = getElementType(element);

  return {
    id: generateElementId(),
    selector: generateSelector(element),
    type,
    content: extractText(element),
    index,
    tagName: element.tagName.toLowerCase(),
    level: type === 'heading' ? getHeadingLevel(element) : undefined,
  };
}

/**
 * 映射内容区域中的所有可教学元素
 */
export function mapContentElements(container: HTMLElement): ExtractedElement[] {
  resetElementCounter();

  // 选择要提取的元素类型
  const selector = 'h1, h2, h3, h4, h5, h6, p, pre, ul, ol, table, blockquote, img, figure';
  const elements = container.querySelectorAll<HTMLElement>(selector);

  const mappedElements: ExtractedElement[] = [];
  let index = 0;

  for (const element of elements) {
    // 跳过空元素
    const text = element.textContent?.trim() || '';
    if (!text && getElementType(element) !== 'image') {
      continue;
    }

    // 跳过嵌套在其他已提取元素中的元素
    // 例如：pre 内的 code
    const parentPre = element.closest('pre');
    if (parentPre && element !== parentPre && getElementType(element) === 'code') {
      continue;
    }

    // 跳过列表项（我们会提取整个列表）
    if (element.tagName === 'LI') {
      continue;
    }

    mappedElements.push(mapElement(element, index++));
  }

  return mappedElements;
}

/**
 * 根据选择器获取元素
 */
export function getElementBySelector(selector: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

/**
 * 高亮元素
 */
export function highlightElement(element: HTMLElement): () => void {
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;

  element.style.outline = '3px solid #667eea';
  element.style.outlineOffset = '2px';

  return () => {
    element.style.outline = originalOutline;
    element.style.outlineOffset = originalOutlineOffset;
  };
}
