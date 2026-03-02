import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Question {
  id: string;
  text: string;
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
      name: 'ai-quizzer-quizzes',
    }
  )
);
