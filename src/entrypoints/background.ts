import { logger } from '@/utils/logger';
import { onMessage } from '@/utils/message';
import { getSettings, saveSettings, getDefaultSettings } from '@/utils/storage';
import { generateLessonPlan, chat } from '@/core/ai';
import type { Settings, ExtractedContent } from '@/types';

export default defineBackground(() => {
  logger.info('网页教师 Background Script 已启动', { id: browser.runtime.id });

  // 初始化设置
  initSettings();

  // 设置消息处理器
  onMessage({
    GET_SETTINGS: async () => {
      const settings = await getSettings();
      return settings || getDefaultSettings();
    },

    SAVE_SETTINGS: async (payload) => {
      await saveSettings(payload as Settings);
      return { success: true };
    },

    GENERATE_LESSON: async (payload) => {
      logger.info('收到生成教案请求');
      const { content } = payload as { content: ExtractedContent };
      const settings = await getSettings();
      if (!settings?.ai.apiKey) {
        return { success: false, error: '请先配置 API Key' };
      }
      return await generateLessonPlan(content, settings.ai);
    },

    CHAT_MESSAGE: async (payload) => {
      logger.info('收到对话消息');
      const { message, context } = payload as { message: string; context: string };
      const settings = await getSettings();
      if (!settings?.ai.apiKey) {
        return { success: false, error: '请先配置 API Key' };
      }
      return await chat(message, context, settings.ai);
    },
  });
});

async function initSettings() {
  const settings = await getSettings();
  if (!settings) {
    await saveSettings(getDefaultSettings());
    logger.info('已初始化默认设置');
  }
}
