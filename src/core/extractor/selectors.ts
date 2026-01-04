/**
 * 内容选择器规则
 * 按优先级排序的CSS选择器，用于识别网页主体内容区域
 */
export const CONTENT_SELECTORS = [
  // 语义化标签
  'article[role="main"]',
  'main article',
  'main',
  'article',

  // 常见类名模式
  '[class*="article-content"]',
  '[class*="post-content"]',
  '[class*="entry-content"]',
  '[class*="content-body"]',
  '[class*="markdown-body"]',
  '[class*="prose"]',

  // 常见ID模式
  '#article-content',
  '#post-content',
  '#content',
  '#main-content',

  // 通用容器
  '.content',
  '.post',
  '.article',
];

/**
 * 需要排除的选择器
 */
export const EXCLUDE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  '.sidebar',
  '.navigation',
  '.nav',
  '.menu',
  '.header',
  '.footer',
  '.comments',
  '.comment',
  '.advertisement',
  '.ad',
  '.ads',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
];

/**
 * 常见技术文档网站的特定选择器
 */
export const SITE_SPECIFIC_SELECTORS: Record<string, string> = {
  'developer.mozilla.org': '.main-page-content',
  'react.dev': 'article',
  'vuejs.org': '.content',
  'docs.github.com': '.markdown-body',
  'w3schools.com': '.w3-main',
  'runoob.com': '#content',
  'juejin.cn': '.article-content',
  'segmentfault.com': '.article',
  'zhihu.com': '.RichText',
  'csdn.net': '#content_views',
};
