'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

const AVATAR_OPTIONS = [
  '😊', '😎', '🤓', '🦊', '🐱', '🐶', '🦁', '🐼',
  '🦄', '🐸', '🦋', '🌟', '🔥', '💎', '🎯', '🚀',
  '🎮', '🎸', '⚡', '🌈', '🍕', '🌮', '🧠', '💡'
];

export function JoinGameForm() {
  const [pin, setPin] = useState('');
  const { username, setUsername, avatar, setAvatar } = useUserStore();
  const [localNickname, setLocalNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatar || '😊');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLocalNickname(username);
    setSelectedAvatar(avatar || '😊');
  }, [username, avatar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin && localNickname) {
      if (localNickname !== username) {
        setUsername(localNickname);
      }
      if (selectedAvatar !== avatar) {
        setAvatar(selectedAvatar);
      }
      // Navigate to the play route with query params
      router.push(`/play/${pin}?nickname=${encodeURIComponent(localNickname)}&avatar=${encodeURIComponent(selectedAvatar)}`);
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
      
      {/* Avatar Picker */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-indigo-300 transition-colors"
        >
          <span className="text-4xl">{selectedAvatar}</span>
          <span className="text-gray-500">Choose your avatar</span>
        </button>
        
        {showAvatarPicker && (
          <div className="absolute z-10 top-full left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(emoji);
                    setShowAvatarPicker(false);
                  }}
                  className={`text-3xl p-2 rounded-lg hover:bg-indigo-100 transition-colors ${
                    selectedAvatar === emoji ? 'bg-indigo-100 ring-2 ring-indigo-500' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
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
