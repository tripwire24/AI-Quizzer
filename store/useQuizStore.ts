import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Question {
  id: string;
  type?: 'choice' | 'open';
  text: string;
  facilitatorNote?: string;
  placeholder?: string;
  options: { id: string; text: string; color: string; isCorrect: boolean }[];
  timeLimit: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
}

interface QuizState {
  quizzes: Quiz[];
  addQuiz: (quiz: Quiz) => void;
  updateQuiz: (id: string, quiz: Quiz) => void;
  deleteQuiz: (id: string) => void;
}

const STORAGE_KEY = 'youngshand-live-lab-quizzes';

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<Question>;
  return (
    typeof question.id === 'string' &&
    typeof question.text === 'string' &&
    Array.isArray(question.options) &&
    typeof question.timeLimit === 'number'
  );
}

function sanitizeQuizzes(value: unknown): Quiz[] {
  if (!Array.isArray(value)) return [];
  return value.filter((quiz): quiz is Quiz => {
    if (!quiz || typeof quiz !== 'object') return false;
    const candidate = quiz as Partial<Quiz>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.description === 'string' &&
      Array.isArray(candidate.questions) &&
      candidate.questions.every(isQuestion) &&
      typeof candidate.createdAt === 'string'
    );
  });
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      quizzes: [],
      addQuiz: (quiz) => set((state) => ({ quizzes: [...state.quizzes, quiz] })),
      updateQuiz: (id, updatedQuiz) => set((state) => ({
        quizzes: state.quizzes.map((q) => (q.id === id ? updatedQuiz : q)),
      })),
      deleteQuiz: (id) => set((state) => ({
        quizzes: state.quizzes.filter((q) => q.id !== id),
      })),
    }),
    {
      name: STORAGE_KEY,
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<QuizState> | undefined;
        return {
          ...currentState,
          quizzes: sanitizeQuizzes(saved?.quizzes),
        };
      },
    }
  )
);
