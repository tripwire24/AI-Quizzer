import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameHistory {
  pin: string;
  date: string;
  score: number;
  rank: number;
  totalPlayers: number;
}

interface UserState {
  username: string;
  avatar: string;
  history: GameHistory[];
  setUsername: (name: string) => void;
  setAvatar: (avatar: string) => void;
  addHistory: (game: GameHistory) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      username: '',
      avatar: '😊',
      history: [],
      setUsername: (username) => set({ username }),
      setAvatar: (avatar) => set({ avatar }),
      addHistory: (game) => set((state) => ({ history: [game, ...state.history] })),
    }),
    {
      name: 'ai-quizzer-user',
    }
  )
);
