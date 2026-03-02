'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { Users, Play } from 'lucide-react';

interface Player {
  id: string;
  socketId: string;
  nickname: string;
  score: number;
}

export default function HostLobby() {
  const params = useParams();
  const router = useRouter();
  const pin = params.pin as string;
  const [players, setPlayers] = useState<Player[]>([]);
  const [joinUrl, setJoinUrl] = useState<string>('');

  useEffect(() => {
    setJoinUrl(window.location.host);
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
    socket.emit('start_game', pin);
    router.push(`/host/game/${pin}`);
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
          {players.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Waiting for players...</h2>
              <p className="text-gray-500 text-lg">Go to <span className="font-semibold text-gray-800">{joinUrl || 'the homepage'}</span> and enter PIN: <span className="font-bold text-indigo-600">{pin}</span></p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm animate-in fade-in zoom-in duration-300"
                >
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                    {player.nickname.charAt(0).toUpperCase()}
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
