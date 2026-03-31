// ============================================================================
// Shared Types — Used by both Web and Mobile apps
// ============================================================================

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  centreSlug?: string; // if registering under a centre
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "CENTRE_ADMIN" | "TEACHER" | "STUDENT";
  avatar?: string;
  centreId?: string;
  centreName?: string;
  centreSlug?: string;
  planType: "FREE" | "VIP_30" | "VIP_90" | "VIP_180";
}

// Question content types (JSON stored in DB)
export interface ReadAloudContent {
  text: string;
}

export interface RepeatSentenceContent {
  audioUrl: string;
  transcript: string; // for AI comparison
}

export interface DescribeImageContent {
  imageUrl: string;
  sampleAnswer?: string;
}

export interface RetellLectureContent {
  audioUrl: string;
  transcript: string;
  sampleAnswer?: string;
}

export interface AnswerShortQuestionContent {
  audioUrl: string;
  question: string;
  acceptedAnswers: string[]; // ["paris", "Paris"]
}

export interface RespondToSituationContent {
  prompt: string;
  context: string;
  sampleAnswer?: string;
}

export interface SummarizeWrittenTextContent {
  passage: string;
  sampleAnswer?: string;
}

export interface WriteEssayContent {
  prompt: string;
  minWords: number;
  maxWords: number;
  sampleAnswer?: string;
}

export interface MCQContent {
  passage?: string;
  audioUrl?: string;
  question: string;
  options: string[];
  correctAnswers: number[]; // indices — single for MCQ_SINGLE, multiple for MCQ_MULTIPLE
}

export interface ReorderParagraphsContent {
  paragraphs: string[];
  correctOrder: number[]; // [2, 0, 3, 1]
}

export interface FillBlanksContent {
  passage: string; // text with {{BLANK}} markers
  blanks: { index: number; correctAnswer: string; options?: string[] }[];
}

export interface WriteFromDictationContent {
  audioUrl: string;
  correctText: string;
}

export interface HighlightCorrectSummaryContent {
  audioUrl: string;
  options: string[];
  correctAnswer: number;
}

export interface SelectMissingWordContent {
  audioUrl: string;
  options: string[];
  correctAnswer: number;
}

export interface SummarizeSpokenTextContent {
  audioUrl: string;
  transcript: string;
  sampleAnswer?: string;
}

// AI Scoring results
export interface SpeakingScore {
  pronunciation: number; // 0-90
  fluency: number;
  content: number;
  overall: number;
  feedback: string;
}

export interface WritingScore {
  grammar: number;
  spelling: number;
  content: number;
  structure: number;
  wordCount: number;
  overall: number;
  feedback: string;
}

export interface ObjectiveScore {
  correct: boolean;
  score: number;
  maxScore: number;
}

// Mock test result
export interface MockTestResult {
  id: string;
  title: string;
  status: "COMPLETED" | "IN_PROGRESS" | "ABANDONED";
  startedAt: string;
  completedAt?: string;
  totalTime?: number;
  scores: {
    speaking: number;
    writing: number;
    reading: number;
    listening: number;
    overall: number;
  };
  sectionBreakdown: {
    section: string;
    questions: {
      questionId: string;
      type: string;
      score: number;
      maxScore: number;
      timeTaken: number;
    }[];
  }[];
}

// Dashboard analytics
export interface StudentDashboard {
  totalAttempts: number;
  totalPracticeTime: number; // minutes
  averageScore: number;
  scoresBySection: Record<string, number>;
  recentAttempts: {
    id: string;
    questionType: string;
    score: number;
    createdAt: string;
  }[];
  scoreTrend: { date: string; score: number }[];
  weakAreas: { type: string; averageScore: number }[];
  strongAreas: { type: string; averageScore: number }[];
}

export interface CentreDashboard {
  totalStudents: number;
  activeStudents: number; // practiced in last 7 days
  averageScore: number;
  topPerformers: { name: string; score: number }[];
  batchComparison: { batch: string; averageScore: number; studentCount: number }[];
  revenueThisMonth: number;
}
