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

const STORAGE_KEY = 'youngshand-live-lab-user';

function sanitizeHistory(value: unknown): GameHistory[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is GameHistory => {
    if (!entry || typeof entry !== 'object') return false;
    const game = entry as Partial<GameHistory>;
    return (
      typeof game.pin === 'string' &&
      typeof game.date === 'string' &&
      typeof game.score === 'number' &&
      typeof game.rank === 'number' &&
      typeof game.totalPlayers === 'number'
    );
  });
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
      name: STORAGE_KEY,
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<UserState> | undefined;
        return {
          ...currentState,
          username: typeof saved?.username === 'string' ? saved.username : currentState.username,
          avatar: typeof saved?.avatar === 'string' && saved.avatar ? saved.avatar : currentState.avatar,
          history: sanitizeHistory(saved?.history),
        };
      },
    }
  )
);
