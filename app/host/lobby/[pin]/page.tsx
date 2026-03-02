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
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    // Get the full origin (protocol + host)
    const origin = window.location.origin;
    setJoinUrl(origin);
    const socket = getSocket();

    // Track connection status
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);

    // Keep-alive ping every 4 minutes to prevent Render free-tier spin-down
    const keepAlive = setInterval(() => {
      fetch('/api/ping').catch(() => {});
    }, 4 * 60 * 1000);

    // Listen for players joining
    socket.on('player_joined', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    socket.on('player_left', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      clearInterval(keepAlive);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
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
    <main className="min-h-screen bg-gray-900 flex flex-col">
      {/* Connection lost warning */}
      {!connected && (
        <div className="bg-red-600 text-white text-center py-3 px-4 font-bold animate-pulse">
          ⚠️ Connection lost — server may have restarted. <button onClick={() => router.push('/host')} className="underline ml-2">Create a new game</button>
        </div>
      )}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
            PIN: {pin}
          </div>
          <div className="flex items-center gap-2 text-gray-400 font-medium">
            <Users className="w-5 h-5" />
            {players.length} Players
          </div>
        </div>
        <button
          onClick={handleStartGame}
          disabled={players.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95"
        >
          <Play className="w-5 h-5" />
          Start Game
        </button>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Join Instructions */}
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 text-center ring-1 ring-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Join the Game</h2>
            
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Go to this URL:</p>
              <div className="flex items-center justify-center gap-2">
                <div className="bg-gray-900 px-6 py-3 rounded-xl ring-1 ring-white/10">
                  <span className="text-xl font-mono font-bold text-indigo-400">{joinUrl || 'Loading...'}</span>
                </div>
                <button
                  onClick={copyJoinLink}
                  className="p-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-xl transition-colors"
                  title="Copy link"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-2">Then enter this PIN:</p>
              <div className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-lg">
                <span className="text-5xl font-black tracking-widest">{pin}</span>
              </div>
            </div>
          </div>

          {/* Players Grid */}
          {players.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10">
                <Users className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-500">Waiting for players to join...</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center shadow-sm animate-in fade-in zoom-in duration-300 ring-1 ring-white/5 hover:ring-indigo-500/30 transition-all"
                >
                  <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                    {player.avatar || '😊'}
                  </div>
                  <p className="font-semibold text-white truncate">{player.nickname}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
