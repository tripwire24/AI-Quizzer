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
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; score: number; pointsEarned: number; speedLabel: string | null; speedBonus: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [myRank, setMyRank] = useState<number>(0);

  useEffect(() => {
    const socket = getSocket();

    const doJoin = () => {
      setError(null);
      socket.emit('join_game', { pin, nickname, avatar });
    };

    if (socket.connected) {
      doJoin();
    }
    socket.on('connect', doJoin);

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

    socket.on('leaderboard_shown', (data: { players: Player[] } | Player[]) => {
      const players = Array.isArray(data) ? data : data.players;
      setStatus('leaderboard');
      setLeaderboard(players);
      const rank = players.findIndex(p => p.socketId === socket.id) + 1;
      setMyRank(rank);
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
      const myData = players.find((p: Player) => p.socketId === socket.id);
      if (myData) {
        setPlayer(prev => prev ? { ...prev, score: myData.score } : null);
      }
    });

    socket.on('game_finished', (players: Player[]) => {
      setStatus('finished');
      setLeaderboard(players);
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
      socket.off('connect', doJoin);
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
      <main className="h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-sm w-full ring-2 ring-red-500/30">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✕</div>
          <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex justify-between items-center z-10 shrink-0 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">{avatar}</span>
          <span className="font-bold text-white text-sm">{nickname}</span>
        </div>
        <div className="bg-gray-700 px-3 py-1 rounded-full text-xs font-semibold text-gray-400">
          PIN: {pin}
        </div>
        <div className="font-black text-indigo-400 text-lg">{lastResult?.score || player?.score || 0} pts</div>
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-700 to-indigo-900 text-white"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mb-4"
              />
              <h2 className="text-2xl font-bold">Connecting...</h2>
            </motion.div>
          )}

          {status === 'lobby' && (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-600 to-purple-700 text-white p-6 text-center"
            >
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-6xl mb-6"
              >
                {avatar}
              </motion.div>
              <h1 className="text-4xl font-black mb-3">You&apos;re in!</h1>
              <p className="text-xl text-indigo-200">Look at the big screen for your name</p>
              <motion.div 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mt-8 text-indigo-300 text-sm"
              >
                Waiting for host to start...
              </motion.div>
            </motion.div>
          )}

          {status === 'question_active' && currentQuestion && (
            <motion.div 
              key="question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col bg-gray-900"
            >
              {/* Timer + Question section */}
              <div className="px-4 pt-3 pb-2 shrink-0">
                {/* Countdown bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                  <motion.div 
                    className={`h-full rounded-full ${timeRemaining <= 5 ? 'bg-red-500' : timeRemaining <= 10 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeRemaining / (currentQuestion.timeLimit || 20)) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-2xl font-black ${timeRemaining <= 5 ? 'text-red-400' : timeRemaining <= 10 ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {timeRemaining}s
                  </span>
                </div>
                {/* Question text */}
                <p className="text-white font-bold text-base leading-snug line-clamp-3">
                  {currentQuestion.text}
                </p>
              </div>

              {/* Answer buttons */}
              <div className="grid grid-cols-2 gap-3 flex-1 p-3 min-h-0">
                {currentQuestion.options.map((option, idx) => {
                  const Icon = idx === 0 ? Triangle : idx === 1 ? Diamond : idx === 2 ? Circle : Square;
                  return (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleAnswer(option.id)}
                      className={`${option.color} rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 ring-2 ring-white/10 active:ring-white/40 transition-all p-3`}
                    >
                      <Icon className="w-10 h-10 text-white fill-white opacity-90" />
                      <span className="text-white text-sm font-bold leading-tight text-center line-clamp-2">{option.text}</span>
                    </motion.button>
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center"
            >
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-20 h-20 bg-indigo-600/30 rounded-full flex items-center justify-center mb-6"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full"
                />
              </motion.div>
              <h2 className="text-3xl font-black mb-2">Locked in! 🔒</h2>
              <p className="text-lg text-gray-400">Waiting for others...</p>
            </motion.div>
          )}

          {status === 'result' && lastResult && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center ${
                lastResult.isCorrect 
                  ? 'bg-gradient-to-b from-green-600 to-green-800' 
                  : 'bg-gradient-to-b from-red-600 to-red-800'
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="text-7xl mb-4"
              >
                {lastResult.isCorrect ? '✅' : '❌'}
              </motion.div>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-black mb-2"
              >
                {lastResult.isCorrect ? 'Nailed it!' : 'Not quite!'}
              </motion.h1>
              {lastResult.speedLabel && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="text-yellow-300 text-xl font-bold mb-3 bg-black/20 px-4 py-1.5 rounded-full"
                >
                  {lastResult.speedLabel}
                </motion.div>
              )}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="bg-black/20 px-8 py-4 rounded-2xl"
              >
                <div className="text-2xl font-bold">+{lastResult.pointsEarned || 0} points</div>
                {(lastResult.speedBonus ?? 0) > 0 && (
                  <div className="text-yellow-300 text-sm font-semibold mt-1">
                    Includes +{lastResult.speedBonus} speed bonus!
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {status === 'leaderboard' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col bg-gradient-to-b from-indigo-700 to-indigo-900 text-white p-4"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring' }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 text-center ring-2 ring-white/20"
              >
                <p className="text-indigo-300 text-xs mb-1 uppercase tracking-wider font-semibold">Your Position</p>
                <div className="text-5xl font-black"># {myRank}</div>
                <p className="text-xl font-bold mt-1 text-indigo-200">{player?.score || 0} pts</p>
              </motion.div>
              
              <div className="flex-1 overflow-y-auto">
                <h3 className="text-sm font-bold mb-2 text-indigo-300 uppercase tracking-wider">Standings</h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((p, idx) => (
                    <motion.div 
                      key={p.id}
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.06 }}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl ${
                        p.nickname === nickname 
                          ? 'bg-white text-indigo-700 font-bold ring-2 ring-white' 
                          : 'bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black ${idx < 3 ? 'text-yellow-400' : ''}`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        {p.avatar && <span className="text-xl">{p.avatar}</span>}
                        <span className="font-semibold truncate max-w-[100px] text-sm">
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
              className="absolute inset-0 flex flex-col bg-gradient-to-b from-indigo-800 to-gray-900 text-white p-4"
            >
              <motion.h1 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl font-black text-center mb-3"
              >
                🎉 Game Over!
              </motion.h1>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-3 text-center ring-2 ring-white/20"
              >
                <p className="text-indigo-300 text-xs mb-1 uppercase tracking-wider font-semibold">You Finished</p>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="text-6xl font-black"
                >
                  #{myRank}
                </motion.div>
                <p className="text-2xl font-bold mt-2 text-indigo-200">{player?.score || 0} points</p>
                <p className="text-indigo-400 text-sm mt-1">out of {leaderboard.length} players</p>
              </motion.div>
              
              <div className="flex-1 overflow-y-auto mb-3">
                <h3 className="text-sm font-bold mb-2 text-indigo-300 uppercase tracking-wider">Final Standings</h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((p, idx) => (
                    <motion.div 
                      key={p.id}
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + idx * 0.08 }}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl ${
                        p.nickname === nickname 
                          ? 'bg-white text-indigo-700 ring-2 ring-white' 
                          : 'bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black ${
                          idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : ''
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        {p.avatar && <span className="text-xl">{p.avatar}</span>}
                        <span className="font-semibold text-sm">{p.nickname}</span>
                      </div>
                      <span className="font-bold">{p.score}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="w-full py-4 bg-white text-indigo-700 hover:bg-gray-100 text-xl font-bold rounded-xl shadow-lg transition-all shrink-0"
              >
                Play Again
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
