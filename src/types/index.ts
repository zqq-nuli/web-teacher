// ============ 教案相关类型 ============

export interface LessonPlan {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  steps: LessonStep[];
  metadata: {
    estimatedTime: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    keywords: string[];
  };
}

export interface LessonStep {
  id: string;
  order: number;
  title: string;
  content: string;
  targetSelector?: string;
  highlightType: 'element' | 'section' | 'modal';
  popoverPosition?: 'top' | 'bottom' | 'left' | 'right';
}

// ============ 学习进度 ============

export interface LearningProgress {
  lessonId: string;
  currentStep: number;
  completedSteps: string[];
  startedAt: number;
  lastAccessedAt: number;
}

// ============ 测验相关 ============

export interface Quiz {
  id: string;
  lessonId: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false';
  question: string;
  options: string[];
  correctAnswer: number | number[];
  explanation: string;
  relatedStepId: string;
}

// ============ 设置配置 ============

export type AIProvider = 'openai' | 'anthropic';
export type TTSProvider = 'native' | 'openai' | 'azure';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface TTSSettings {
  provider: TTSProvider;
  voice?: string;
  rate: number;
  enabled: boolean;
}

export interface GuideSettings {
  autoAdvance: boolean;
  autoAdvanceDelay: number;
  showProgress: boolean;
}

export interface Settings {
  ai: AISettings;
  tts: TTSSettings;
  guide: GuideSettings;
}

// ============ 内容提取 ============

export type ElementType = 'heading' | 'paragraph' | 'code' | 'list' | 'image' | 'table' | 'blockquote';

export interface ExtractedElement {
  id: string;
  selector: string;
  type: ElementType;
  content: string;
  index: number;
  tagName: string;
  level?: number; // 用于标题层级
}

export interface ExtractedContent {
  url: string;
  title: string;
  elements: ExtractedElement[];
  rawText: string;
}

// ============ 消息通信 ============

export type MessageType =
  | 'GENERATE_LESSON'
  | 'LESSON_GENERATED'
  | 'START_GUIDE'
  | 'STOP_GUIDE'
  | 'NEXT_STEP'
  | 'PREV_STEP'
  | 'CHAT_MESSAGE'
  | 'CHAT_RESPONSE'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'ERROR';

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
  error?: string;
}

// ============ UI状态 ============

export type LessonStatus = 'idle' | 'extracting' | 'generating' | 'ready' | 'playing' | 'paused' | 'completed' | 'error';

export interface UIState {
  isFloatingPanelVisible: boolean;
  floatingPanelPosition: { x: number; y: number };
  lessonStatus: LessonStatus;
  currentStepIndex: number;
  errorMessage?: string;
}
