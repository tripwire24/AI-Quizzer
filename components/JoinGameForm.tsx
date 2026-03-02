'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export function JoinGameForm() {
  const [pin, setPin] = useState('');
  const { username, setUsername, avatar } = useUserStore();
  const [localNickname, setLocalNickname] = useState('');
  const router = useRouter();

  useEffect(() => {
    setLocalNickname(username);
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin && localNickname) {
      if (localNickname !== username) {
        setUsername(localNickname);
      }
      // Navigate to the play route with query params
      router.push(`/play/${pin}?nickname=${encodeURIComponent(localNickname)}&avatar=${encodeURIComponent(avatar)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Game PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
          maxLength={6}
          required
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="Nickname"
          value={localNickname}
          onChange={(e) => setLocalNickname(e.target.value)}
          className="w-full px-4 py-3 text-center text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
          maxLength={15}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
      >
        Enter
      </button>
    </form>
  );
}
