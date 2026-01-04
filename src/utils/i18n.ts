/**
 * i18n 国际化工具模块
 * 封装 Chrome Extension i18n API
 */

/**
 * 获取翻译文本
 * @param key 翻译键名
 * @param substitutions 替换参数（对应 $1, $2 等占位符）
 * @returns 翻译后的文本，如果未找到则返回 key
 */
export function t(key: string, substitutions?: string | string[]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message = (browser.i18n.getMessage as any)(key, substitutions);
  return message || key;
}

/**
 * 获取当前 UI 语言
 * @returns 语言代码，如 'zh-CN', 'en'
 */
export function getUILanguage(): string {
  return browser.i18n.getUILanguage();
}

/**
 * 检查当前是否为中文环境
 */
export function isChinese(): boolean {
  const lang = getUILanguage();
  return lang.startsWith('zh');
}

/**
 * 检查当前是否为英文环境
 */
export function isEnglish(): boolean {
  const lang = getUILanguage();
  return lang.startsWith('en');
}
