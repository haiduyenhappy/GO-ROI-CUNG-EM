export type AppScreen = 'onboarding' | 'emotion' | 'chat' | 'reward' | 'saved' | 'daily-situation' | 'journey' | 'lessons' | 'parent-connect' | 'emotion-tracking' | 'teacher-dashboard';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isActionCard?: boolean;
  hasAdvice?: boolean;
  steps?: string[];
  isSaved?: boolean;
  starsEarned?: number;
  encouragement?: string;
  type?: 'greeting' | 'advice';
}

export interface RewardRecord {
  date: string;
  stars: number;
  type: 'chat' | 'situation';
}

export interface SavedAdvice {
  id: string;
  title: string;
  text: string;
  timestamp: Date;
}

export interface DailySituation {
  id: string;
  text: string;
  topic: string;
}

export interface CompletedSituation {
  id: string;
  date: string;
  situation: string;
  userAnswer: string;
  aiFeedback: string;
  stars: number;
}

export interface Lesson {
  id: string;
  category: 'Cảm xúc' | 'Giao tiếp' | 'Bạn bè' | 'Gia đình' | 'Bản thân';
  title: string;
  content: string[];
  ending: string;
  icon: string;
  color: string;
  imageSeed: string;
}

export interface EmotionRecord {
  id: string;
  date: string;
  time: string;
  emotionId: string;
  emoji: string;
  label: string;
  note?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface Emotion {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export interface Alert {
  id: string;
  type: 'sadness' | 'anger' | 'tiredness' | 'pattern-change';
  message: string;
  timestamp: Date;
  suggestions: string[];
}

export interface StudentSummary {
  id: string;
  date: string;
  summary: string;
  keywords: string[];
}

export interface Student {
  id: string;
  name: string;
  supportLevel: 'Ổn định' | 'Cần chú ý' | 'Cần quan tâm' | 'Cần hỗ trợ ngay';
  frequentEmotion: string;
  totalStars: number;
  lastActivity: string;
  emotionRecords: EmotionRecord[];
  completedSituations: CompletedSituation[];
  alerts: Alert[];
  summaries: StudentSummary[];
}

export interface TeacherState {
  alerts: Alert[];
  summaries: StudentSummary[];
  students: Student[];
}
