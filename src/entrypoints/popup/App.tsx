import { useState } from 'react';
import { useSettingsStore } from '@/store';
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
        throw new Error('无法获取当前标签页');
      }

      // 2. 提取页面内容
      const extractResult = await browser.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' }) as {
        success: boolean;
        data?: ExtractedContent;
        error?: string;
      };

      if (!extractResult.success || !extractResult.data) {
        throw new Error(extractResult.error || '内容提取失败');
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
        throw new Error(lessonResult.error || '教案生成失败');
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
        throw new Error(guideResult.error || '引导启动失败');
      }

      // 成功，关闭弹窗
      window.close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      setStatus('error');
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'extracting':
        return '📖 正在分析页面...';
      case 'generating':
        return '🤖 AI正在生成教案...';
      case 'starting':
        return '🚀 正在启动引导...';
      case 'error':
        return '❌ 发生错误，点击重试';
      default:
        return ai.apiKey ? '🎓 开始学习当前页面' : '⚠️ 请先配置API Key';
    }
  };

  const isLoading = ['extracting', 'generating', 'starting'].includes(status);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>📚 网页教师</h1>
        <p className="subtitle">将网页教程转化为交互式学习体验</p>
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
          <h2>🤖 AI 配置</h2>

          <div className="form-group">
            <label>AI 提供商</label>
            <select
              value={ai.provider}
              onChange={(e) => setAISettings({
                provider: e.target.value as AIProvider,
                model: AI_MODELS[e.target.value as AIProvider][0]
              })}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>

          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              placeholder={`输入你的 ${ai.provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Key`}
              value={ai.apiKey}
              onChange={(e) => setAISettings({ apiKey: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>模型</label>
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
            <label>自定义 Base URL (可选)</label>
            <input
              type="text"
              placeholder="例如: https://api.openai.com/v1"
              value={ai.baseUrl || ''}
              onChange={(e) => setAISettings({ baseUrl: e.target.value || undefined })}
            />
          </div>
        </section>

        {/* TTS配置 */}
        <section className="config-section">
          <h2>🔊 语音配置</h2>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={tts.enabled}
                onChange={(e) => setTTSSettings({ enabled: e.target.checked })}
              />
              启用语音播报
            </label>
          </div>

          <div className="form-group">
            <label>语音引擎</label>
            <select
              value={tts.provider}
              onChange={(e) => setTTSSettings({ provider: e.target.value as TTSProvider })}
              disabled={!tts.enabled}
            >
              <option value="native">浏览器原生 (免费)</option>
              <option value="openai">OpenAI TTS</option>
            </select>
          </div>

          <div className="form-group">
            <label>语速: {tts.rate.toFixed(1)}x</label>
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
          <h2>⚙️ 引导配置</h2>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={guide.autoAdvance}
                onChange={(e) => setGuideSettings({ autoAdvance: e.target.checked })}
              />
              自动进入下一步
            </label>
          </div>

          {guide.autoAdvance && (
            <div className="form-group">
              <label>自动延迟: {(guide.autoAdvanceDelay / 1000).toFixed(1)}秒</label>
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
              显示学习进度
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
