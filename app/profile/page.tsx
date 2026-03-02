'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { ArrowLeft, Trophy, History, User } from 'lucide-react';

const AVATARS = ['😊', '😎', '🤓', '🤖', '👽', '👻', '🦊', '🐼', '🦄', '🚀'];

export default function ProfilePage() {
  const router = useRouter();
  const { username, avatar, history, setUsername, setAvatar } = useUserStore();
  const [localUsername, setLocalUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setLocalUsername(username);
  }, [username]);

  const handleSave = () => {
    if (localUsername.trim()) {
      setUsername(localUsername.trim());
      setIsEditing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-indigo-600 h-32 relative"></div>
          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-8">
              <div className="relative group">
                <div className="w-32 h-32 bg-white rounded-full p-2 shadow-lg">
                  <div className="w-full h-full bg-indigo-50 rounded-full flex items-center justify-center text-6xl">
                    {avatar}
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={localUsername}
                      onChange={(e) => setLocalUsername(e.target.value)}
                      className="text-3xl font-bold text-gray-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                      autoFocus
                    />
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm">Save</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">{username || 'Guest Player'}</h1>
                    <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                  </div>
                )}
                <p className="text-gray-500 mt-1">Joined recently</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Choose Avatar</h3>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setAvatar(emoji)}
                    className={`w-12 h-12 text-2xl rounded-xl flex items-center justify-center transition-all ${
                      avatar === emoji ? 'bg-indigo-100 ring-2 ring-indigo-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Match History</h2>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-gray-400" />
              </div>
              <p>No games played yet. Join a game to see your history!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((game, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div>
                    <div className="font-bold text-gray-900 text-lg">PIN: {game.pin}</div>
                    <div className="text-sm text-gray-500">{new Date(game.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-indigo-600 text-xl">{game.score} pts</div>
                    <div className="text-sm font-medium text-gray-500">
                      Rank: <span className={game.rank <= 3 ? 'text-yellow-500' : ''}>#{game.rank}</span> / {game.totalPlayers}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
