import { CONTENT_SELECTORS, EXCLUDE_SELECTORS, SITE_SPECIFIC_SELECTORS } from './selectors';

/**
 * 检测并返回网页的主内容区域
 */
export function detectMainContent(): HTMLElement | null {
  // 1. 首先尝试网站特定选择器
  const hostname = window.location.hostname.replace('www.', '');
  const siteSelector = SITE_SPECIFIC_SELECTORS[hostname];
  if (siteSelector) {
    const element = document.querySelector<HTMLElement>(siteSelector);
    if (element && isValidContentElement(element)) {
      return element;
    }
  }

  // 2. 尝试通用内容选择器
  for (const selector of CONTENT_SELECTORS) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const element of elements) {
      if (isValidContentElement(element) && !isExcludedElement(element)) {
        return element;
      }
    }
  }

  // 3. 基于文本密度的启发式检测
  return detectByTextDensity();
}

/**
 * 验证元素是否是有效的内容区域
 */
function isValidContentElement(element: HTMLElement): boolean {
  // 检查可见性
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  // 检查尺寸
  const rect = element.getBoundingClientRect();
  if (rect.width < 200 || rect.height < 100) {
    return false;
  }

  // 检查文本内容
  const text = element.textContent?.trim() || '';
  if (text.length < 100) {
    return false;
  }

  return true;
}

/**
 * 检查元素是否应该被排除
 */
function isExcludedElement(element: HTMLElement): boolean {
  // 检查元素本身是否匹配排除选择器
  for (const selector of EXCLUDE_SELECTORS) {
    if (element.matches(selector)) {
      return true;
    }
  }

  // 检查父元素是否是排除区域
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    for (const selector of EXCLUDE_SELECTORS) {
      if (parent.matches(selector)) {
        return true;
      }
    }
    parent = parent.parentElement;
  }

  return false;
}

/**
 * 基于文本密度检测主内容区域
 * 原理：主内容区域通常有较高的文本/标签比例
 */
function detectByTextDensity(): HTMLElement | null {
  const candidates: Array<{ element: HTMLElement; score: number }> = [];

  // 获取所有块级容器
  const containers = document.querySelectorAll<HTMLElement>('div, section, article');

  for (const container of containers) {
    if (isExcludedElement(container)) continue;

    const score = calculateContentScore(container);
    if (score > 0) {
      candidates.push({ element: container, score });
    }
  }

  // 按分数排序，返回最高分的元素
  candidates.sort((a, b) => b.score - a.score);

  return candidates[0]?.element || null;
}

/**
 * 计算元素的内容分数
 */
function calculateContentScore(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const text = element.textContent?.trim() || '';
  const html = element.innerHTML;

  // 面积太小的排除
  if (rect.width < 300 || rect.height < 200) {
    return 0;
  }

  // 文本太少的排除
  if (text.length < 200) {
    return 0;
  }

  // 计算文本密度（文本长度 / HTML长度）
  const textDensity = text.length / (html.length || 1);

  // 计算段落数量
  const paragraphs = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, code, li');
  const paragraphScore = Math.min(paragraphs.length / 5, 2);

  // 计算代码块数量（技术文档重要指标）
  const codeBlocks = element.querySelectorAll('pre, code');
  const codeScore = Math.min(codeBlocks.length / 2, 1);

  // 综合评分
  const score = textDensity * 10 + paragraphScore + codeScore;

  return score;
}

/**
 * 获取内容区域的边界矩形
 */
export function getContentBounds(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}
