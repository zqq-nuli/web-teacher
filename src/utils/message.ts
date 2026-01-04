import type { Message, MessageType } from '@/types';

type MessageSender = Parameters<Parameters<typeof browser.runtime.onMessage.addListener>[0]>[1];

/**
 * 发送消息到Background Script
 */
export async function sendToBackground<T = unknown, R = unknown>(
  type: MessageType,
  payload?: T
): Promise<R> {
  const message: Message<T> = { type, payload };
  return browser.runtime.sendMessage(message);
}

/**
 * 发送消息到Content Script
 */
export async function sendToContentScript<T = unknown, R = unknown>(
  tabId: number,
  type: MessageType,
  payload?: T
): Promise<R> {
  const message: Message<T> = { type, payload };
  return browser.tabs.sendMessage(tabId, message);
}

/**
 * 发送消息到当前活动标签页的Content Script
 */
export async function sendToActiveTab<T = unknown, R = unknown>(
  type: MessageType,
  payload?: T
): Promise<R> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  return sendToContentScript(tab.id, type, payload);
}

/**
 * 创建消息处理器
 */
export function createMessageHandler(
  handlers: Partial<Record<MessageType, (payload: unknown) => Promise<unknown> | unknown>>
) {
  return (
    message: Message,
    _sender: MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    const handler = handlers[message.type];
    if (handler) {
      const result = handler(message.payload);
      if (result instanceof Promise) {
        result
          .then(sendResponse)
          .catch((error) => sendResponse({ error: error.message }));
        return true; // 保持消息通道开放
      }
      sendResponse(result);
    }
    return false;
  };
}

/**
 * 监听消息
 */
export function onMessage(
  handlers: Partial<Record<MessageType, (payload: unknown) => Promise<unknown> | unknown>>
) {
  const handler = createMessageHandler(handlers);
  browser.runtime.onMessage.addListener(handler);
  return () => browser.runtime.onMessage.removeListener(handler);
}
