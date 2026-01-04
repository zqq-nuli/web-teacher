import React from 'react';

interface ControlButtonsProps {
  isPlaying: boolean;
  isPaused: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isTTSEnabled: boolean;
  isTTSSpeaking: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onToggleTTS: () => void;
}

/**
 * 控制按钮组件
 */
export function ControlButtons({
  isPlaying,
  isPaused,
  canGoPrevious,
  canGoNext,
  isTTSEnabled,
  isTTSSpeaking,
  onPrevious,
  onNext,
  onPlayPause,
  onStop,
  onToggleTTS,
}: ControlButtonsProps) {
  return (
    <div className="wt-controls">
      <div className="wt-controls-main">
        {/* 上一步 */}
        <button
          className="wt-btn wt-btn-nav"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          title="上一步"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* 播放/暂停 */}
        <button
          className="wt-btn wt-btn-primary"
          onClick={onPlayPause}
          title={isPaused ? '继续' : '暂停'}
        >
          {isPaused ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>

        {/* 下一步 */}
        <button
          className="wt-btn wt-btn-nav"
          onClick={onNext}
          disabled={!canGoNext}
          title="下一步"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      <div className="wt-controls-secondary">
        {/* TTS 开关 */}
        <button
          className={`wt-btn wt-btn-icon ${isTTSEnabled ? 'wt-btn-active' : ''}`}
          onClick={onToggleTTS}
          title={isTTSEnabled ? '关闭语音' : '开启语音'}
        >
          {isTTSEnabled ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          )}
          {isTTSSpeaking && <span className="wt-speaking-indicator" />}
        </button>

        {/* 停止 */}
        <button
          className="wt-btn wt-btn-icon wt-btn-danger"
          onClick={onStop}
          title="停止学习"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ControlButtons;
