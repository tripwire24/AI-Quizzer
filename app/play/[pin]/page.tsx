'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { Triangle, Square, Circle, Diamond } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; color: string; isCorrect: boolean }[];
  timeLimit: number;
}

interface Player {
  id: string;
  socketId: string;
  nickname: string;
  avatar: string;
  score: number;
}

export default function PlayGame() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const pin = params.pin as string;
  const nickname = searchParams.get('nickname') || 'Guest';
  const avatar = searchParams.get('avatar') || '😊';

  const [status, setStatus] = useState<'connecting' | 'lobby' | 'question_active' | 'answered' | 'result' | 'leaderboard' | 'finished'>('connecting');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [player, setPlayer] = useState<Player | null>(null);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [myRank, setMyRank] = useState<number>(0);

  useEffect(() => {
    const socket = getSocket();

    socket.emit('join_game', { pin, nickname, avatar });

    socket.on('joined_game', ({ pin, player }) => {
      setStatus('lobby');
      setPlayer(player);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setStatus('connecting');
    });

    socket.on('question_started', ({ question, totalQuestions }) => {
      setStatus('question_active');
      setCurrentQuestion(question);
      setTimeRemaining(question.timeLimit);
      setLastResult(null);
    });

    socket.on('answer_result', (result) => {
      setStatus('result');
      setLastResult(result);
    });

    socket.on('leaderboard_shown', (players: Player[]) => {
      setStatus('leaderboard');
      setLeaderboard(players);
      const rank = players.findIndex(p => p.socketId === socket.id) + 1;
      setMyRank(rank);
      // Update player score from leaderboard
      const myData = players.find(p => p.socketId === socket.id);
      if (myData) {
        setPlayer(prev => prev ? { ...prev, score: myData.score } : null);
      }
    });

    socket.on('mid_game_leaderboard', ({ leaderboard: players }) => {
      setStatus('leaderboard');
      setLeaderboard(players);
      const rank = players.findIndex((p: Player) => p.socketId === socket.id) + 1;
      setMyRank(rank);
      // Update player score from leaderboard
      const myData = players.find((p: Player) => p.socketId === socket.id);
      if (myData) {
        setPlayer(prev => prev ? { ...prev, score: myData.score } : null);
      }
    });

    socket.on('game_finished', (players: Player[]) => {
      setStatus('finished');
      setLeaderboard(players);
      
      // Save to history
      const rank = players.findIndex(p => p.socketId === socket.id) + 1;
      const myScore = players.find(p => p.socketId === socket.id)?.score || 0;
      setMyRank(rank);
      
      useUserStore.getState().addHistory({
        pin,
        date: new Date().toISOString(),
        score: myScore,
        rank: rank,
        totalPlayers: players.length
      });
    });

    socket.on('host_disconnected', () => {
      setError('Host disconnected');
      setStatus('connecting');
    });

    return () => {
      socket.off('joined_game');
      socket.off('error');
      socket.off('question_started');
      socket.off('answer_result');
      socket.off('leaderboard_shown');
      socket.off('mid_game_leaderboard');
      socket.off('game_finished');
      socket.off('host_disconnected');
    };
  }, [pin, nickname, avatar]);

  // Handle timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'question_active') {
      timer = setInterval(() => {
        setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  const handleAnswer = (answerId: string) => {
    if (status !== 'question_active') return;
    
    const socket = getSocket();
    socket.emit('submit_answer', { pin, answerId, timeRemaining });
    setStatus('answered');
  };

  if (error) {
    return (
      <main className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm flex justify-between items-center z-10">
        <div className="font-bold text-gray-900">{nickname}</div>
        <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-semibold text-gray-600">
          PIN: {pin}
        </div>
        <div className="font-black text-indigo-600">{lastResult?.score || player?.score || 0}</div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          
          {status === 'connecting' && (
            <motion.div 
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-600 text-white"
            >
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
              <h2 className="text-2xl font-bold">Connecting...</h2>
            </motion.div>
          )}

          {status === 'lobby' && (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-600 text-white p-6 text-center"
            >
              <h1 className="text-4xl font-black mb-4">You&apos;re in!</h1>
              <p className="text-xl text-indigo-200">See your nickname on screen?</p>
            </motion.div>
          )}

          {status === 'question_active' && currentQuestion && (
            <motion.div 
              key="question"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute inset-0 flex flex-col p-4"
            >
              <div className="grid grid-cols-2 gap-4 flex-1">
                {currentQuestion.options.map((option, idx) => {
                  const Icon = idx === 0 ? Triangle : idx === 1 ? Diamond : idx === 2 ? Circle : Square;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      className={`${option.color} rounded-2xl shadow-md active:scale-95 transition-transform flex items-center justify-center`}
                    >
                      <Icon className="w-16 h-16 text-white fill-white" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {status === 'answered' && (
            <motion.div 
              key="answered"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-900 p-6 text-center"
            >
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <div className="w-10 h-10 border-4 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
              </div>
              <h2 className="text-3xl font-black mb-2">Waiting for others...</h2>
              <p className="text-lg text-gray-500">You answered!</p>
            </motion.div>
          )}

          {status === 'result' && lastResult && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center ${
                lastResult.isCorrect ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              <h1 className="text-5xl font-black mb-4">
                {lastResult.isCorrect ? 'Correct!' : 'Incorrect'}
              </h1>
              <div className="bg-black/20 px-6 py-3 rounded-full text-2xl font-bold">
                {lastResult.isCorrect ? `+${lastResult.score - (player?.score || 0)}` : '0'} points
              </div>
            </motion.div>
          )}

          {status === 'leaderboard' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col bg-indigo-600 text-white p-4"
            >
              {/* My Position Highlight */}
              <div className="bg-white/20 rounded-2xl p-4 mb-4 text-center">
                <p className="text-indigo-200 text-sm mb-1">Your Position</p>
                <div className="text-5xl font-black"># {myRank}</div>
                <p className="text-xl font-bold mt-1">{player?.score || 0} pts</p>
              </div>
              
              {/* Leaderboard List */}
              <div className="flex-1 overflow-y-auto">
                <h3 className="text-lg font-bold mb-2 text-indigo-200">Leaderboard</h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((p, idx) => (
                    <motion.div 
                      key={p.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl ${
                        p.nickname === nickname 
                          ? 'bg-white text-indigo-600 font-bold' 
                          : 'bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black ${idx < 3 ? 'text-yellow-400' : ''}`}>
                          #{idx + 1}
                        </span>
                        {p.avatar && <span className="text-2xl">{p.avatar}</span>}
                        <span className="font-semibold truncate max-w-[120px]">
                          {p.nickname}
                        </span>
                      </div>
                      <span className="font-bold">{p.score}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {status === 'finished' && (
            <motion.div 
              key="finished"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col bg-indigo-600 text-white p-4"
            >
              <h1 className="text-3xl font-black text-center mb-4">Game Over!</h1>
              
              {/* Final Position */}
              <div className="bg-white/20 rounded-2xl p-6 mb-4 text-center">
                <p className="text-indigo-200 text-sm mb-1">You Finished</p>
                <div className="text-6xl font-black">#{myRank}</div>
                <p className="text-2xl font-bold mt-2">{player?.score || 0} points</p>
                <p className="text-indigo-200 mt-1">out of {leaderboard.length} players</p>
              </div>
              
              {/* Top 5 */}
              <div className="flex-1 overflow-y-auto mb-4">
                <h3 className="text-lg font-bold mb-2 text-indigo-200">Top 5</h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((p, idx) => (
                    <div 
                      key={p.id}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl ${
                        p.nickname === nickname 
                          ? 'bg-white text-indigo-600' 
                          : 'bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black ${
                          idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : ''
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        {p.avatar && <span className="text-2xl">{p.avatar}</span>}
                        <span className="font-semibold">{p.nickname}</span>
                      </div>
                      <span className="font-bold">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full py-4 bg-white text-indigo-600 hover:bg-gray-100 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
              >
                Play Again
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
