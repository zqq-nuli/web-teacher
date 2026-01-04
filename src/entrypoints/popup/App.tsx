import { useState } from 'react';
import { useSettingsStore } from '@/store';
import { t } from '@/utils/i18n';
import type { AIProvider, TTSProvider, ExtractedContent, LessonPlan } from '@/types';
import './App.css';

const AI_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
};

type LearningStatus = 'idle' | 'extracting' | 'generating' | 'starting' | 'error';

function App() {
  const { ai, tts, guide, setAISettings, setTTSSettings, setGuideSettings } = useSettingsStore();
  const [status, setStatus] = useState<LearningStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleStartLesson = async () => {
    try {
      setError(null);
      setStatus('extracting');

      // 1. 获取当前标签页
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error(t('error_no_tab'));
      }

      // 2. 提取页面内容
      const extractResult = await browser.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' }) as {
        success: boolean;
        data?: ExtractedContent;
        error?: string;
      };

      if (!extractResult.success || !extractResult.data) {
        throw new Error(extractResult.error || t('error_extract_failed'));
      }

      setStatus('generating');

      // 3. 生成教案
      const lessonResult = await browser.runtime.sendMessage({
        type: 'GENERATE_LESSON',
        payload: { content: extractResult.data },
      }) as {
        success: boolean;
        data?: LessonPlan;
        error?: string;
      };

      if (!lessonResult.success || !lessonResult.data) {
        throw new Error(lessonResult.error || t('error_generate_failed'));
      }

      setStatus('starting');

      // 4. 启动引导
      const guideResult = await browser.tabs.sendMessage(tab.id, {
        type: 'START_GUIDE',
        payload: {
          lessonPlan: lessonResult.data,
          settings: guide,
        },
      }) as {
        success: boolean;
        error?: string;
      };

      if (!guideResult.success) {
        throw new Error(guideResult.error || t('error_guide_failed'));
      }

      // 成功，关闭弹窗
      window.close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('error_unknown');
      setError(errorMessage);
      setStatus('error');
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'extracting':
        return t('popup_status_extracting');
      case 'generating':
        return t('popup_status_generating');
      case 'starting':
        return t('popup_status_starting');
      case 'error':
        return t('popup_status_error');
      default:
        return ai.apiKey ? t('popup_start_learning') : t('popup_missing_api_key');
    }
  };

  const isLoading = ['extracting', 'generating', 'starting'].includes(status);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>{t('popup_title')}</h1>
        <p className="subtitle">{t('popup_subtitle')}</p>
      </header>

      <main className="popup-content">
        {/* 开始学习按钮 */}
        <button
          className={`start-button ${isLoading ? 'loading' : ''} ${status === 'error' ? 'error' : ''}`}
          onClick={handleStartLesson}
          disabled={!ai.apiKey || isLoading}
        >
          {getButtonText()}
        </button>

        {/* 错误提示 */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* AI配置 */}
        <section className="config-section">
          <h2>{t('popup_ai_config')}</h2>

          <div className="form-group">
            <label>{t('popup_ai_provider')}</label>
            <select
              value={ai.provider}
              onChange={(e) => setAISettings({
                provider: e.target.value as AIProvider,
                model: AI_MODELS[e.target.value as AIProvider][0]
              })}
            >
              <option value="openai">{t('popup_ai_provider_openai')}</option>
              <option value="anthropic">{t('popup_ai_provider_anthropic')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('popup_api_key')}</label>
            <input
              type="password"
              placeholder={ai.provider === 'openai' ? t('popup_api_key_placeholder_openai') : t('popup_api_key_placeholder_anthropic')}
              value={ai.apiKey}
              onChange={(e) => setAISettings({ apiKey: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>{t('popup_model')}</label>
            <select
              value={ai.model}
              onChange={(e) => setAISettings({ model: e.target.value })}
            >
              {AI_MODELS[ai.provider].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('popup_base_url')}</label>
            <input
              type="text"
              placeholder={t('popup_base_url_placeholder')}
              value={ai.baseUrl || ''}
              onChange={(e) => setAISettings({ baseUrl: e.target.value || undefined })}
            />
          </div>
        </section>

        {/* TTS配置 */}
        <section className="config-section">
          <h2>{t('popup_tts_config')}</h2>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={tts.enabled}
                onChange={(e) => setTTSSettings({ enabled: e.target.checked })}
              />
              {t('popup_tts_enable')}
            </label>
          </div>

          <div className="form-group">
            <label>{t('popup_tts_engine')}</label>
            <select
              value={tts.provider}
              onChange={(e) => setTTSSettings({ provider: e.target.value as TTSProvider })}
              disabled={!tts.enabled}
            >
              <option value="native">{t('popup_tts_native')}</option>
              <option value="openai">{t('popup_tts_openai')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('popup_tts_rate', tts.rate.toFixed(1))}</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={tts.rate}
              onChange={(e) => setTTSSettings({ rate: parseFloat(e.target.value) })}
              disabled={!tts.enabled}
            />
          </div>
        </section>

        {/* 引导配置 */}
        <section className="config-section">
          <h2>{t('popup_guide_config')}</h2>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={guide.autoAdvance}
                onChange={(e) => setGuideSettings({ autoAdvance: e.target.checked })}
              />
              {t('popup_auto_advance')}
            </label>
          </div>

          {guide.autoAdvance && (
            <div className="form-group">
              <label>{t('popup_auto_delay', (guide.autoAdvanceDelay / 1000).toFixed(1))}</label>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={guide.autoAdvanceDelay}
                onChange={(e) => setGuideSettings({ autoAdvanceDelay: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={guide.showProgress}
                onChange={(e) => setGuideSettings({ showProgress: e.target.checked })}
              />
              {t('popup_show_progress')}
            </label>
          </div>
        </section>
      </main>

      <footer className="popup-footer">
        <span>v0.1.0</span>
      </footer>
    </div>
  );
}

export default App;
