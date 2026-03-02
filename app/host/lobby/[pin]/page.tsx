'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Users, Play, Copy, Check } from 'lucide-react';

interface Player {
  id: string;
  socketId: string;
  nickname: string;
  avatar: string;
  score: number;
}

export default function HostLobby() {
  const params = useParams();
  const router = useRouter();
  const pin = params.pin as string;
  const [players, setPlayers] = useState<Player[]>([]);
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get the full origin (protocol + host)
    const origin = window.location.origin;
    setJoinUrl(origin);
    const socket = getSocket();

    // Listen for players joining
    socket.on('player_joined', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    socket.on('player_left', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      socket.off('player_joined');
      socket.off('player_left');
    };
  }, []);

  const handleStartGame = () => {
    const socket = getSocket();
    
    // Listen for game_started before navigating
    socket.once('game_started', () => {
      router.push(`/host/game/${pin}`);
    });
    
    socket.emit('start_game', pin);
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold text-xl">
            PIN: {pin}
          </div>
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <Users className="w-5 h-5" />
            {players.length} Players
          </div>
        </div>
        <button
          onClick={handleStartGame}
          disabled={players.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
        >
          <Play className="w-5 h-5" />
          Start Game
        </button>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Join Instructions - Always visible */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Join the Game</h2>
            
            {/* Join URL */}
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-2">Go to this URL:</p>
              <div className="flex items-center justify-center gap-2">
                <div className="bg-gray-100 px-6 py-3 rounded-xl">
                  <span className="text-xl font-mono font-bold text-gray-800">{joinUrl || 'Loading...'}</span>
                </div>
                <button
                  onClick={copyJoinLink}
                  className="p-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-xl transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Game PIN */}
            <div>
              <p className="text-gray-500 text-sm mb-2">Then enter this PIN:</p>
              <div className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-2xl">
                <span className="text-5xl font-black tracking-widest">{pin}</span>
              </div>
            </div>
          </div>

          {/* Players Grid */}
          {players.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600">Waiting for players to join...</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm animate-in fade-in zoom-in duration-300"
                >
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                    {player.avatar || '😊'}
                  </div>
                  <p className="font-semibold text-gray-900 truncate">{player.nickname}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
