
export interface Question {
  id: number;
  year: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export type AppStep = 'intro' | 'quiz' | 'result' | 'ai-analysis' | 'admin-login' | 'admin-dashboard';

export interface SavedRecord {
  id: string;
  timestamp: string;
  score: number;
  totalQuestions: number;
  rankTitle: string;
}

export interface QuizState {
  currentStep: AppStep;
  currentIndex: number;
  score: number;
  selectedOption: number | null;
  showExplanation: boolean;
  userAnswers: { questionId: number, isCorrect: boolean }[];
}
