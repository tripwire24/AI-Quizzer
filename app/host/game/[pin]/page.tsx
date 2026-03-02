'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Triangle, Square, Circle, Diamond } from 'lucide-react';

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
  hasAnswered: boolean;
  lastAnswerCorrect: boolean;
}

export default function HostGame() {
  const params = useParams();
  const router = useRouter();
  const pin = params.pin as string;
  
  const [status, setStatus] = useState<'loading' | 'question_active' | 'leaderboard' | 'mid_leaderboard' | 'finished'>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [questionsRemaining, setQuestionsRemaining] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = getSocket();

    // Request game state when component mounts
    socket.emit('get_game_state', pin);

    // Handle initial game state
    socket.on('game_state', ({ status: gameStatus, questionIndex: qIdx, question, totalQuestions: total, players }) => {
      setStatus('question_active');
      setCurrentQuestion(question);
      setQuestionIndex(qIdx);
      setTotalQuestions(total);
      setTimeRemaining(question.timeLimit);
      setTotalPlayers(players.length);
      setAnswersCount(0);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            socket.emit('show_leaderboard', pin);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('question_started', ({ questionIndex: qIdx, question, totalQuestions: total }) => {
      setStatus('question_active');
      setCurrentQuestion(question);
      setQuestionIndex(qIdx);
      setTotalQuestions(total);
      setTimeRemaining(question.timeLimit);
      setAnswersCount(0);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            socket.emit('show_leaderboard', pin);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('player_answered', ({ totalAnswers, totalPlayers: tp }) => {
      setAnswersCount(totalAnswers);
      setTotalPlayers(tp);
      
      // If everyone answered, stop timer and show leaderboard
      if (totalAnswers === tp) {
        if (timerRef.current) clearInterval(timerRef.current);
        socket.emit('show_leaderboard', pin);
      }
    });

    socket.on('leaderboard_shown', (players: Player[]) => {
      setStatus('leaderboard');
      setLeaderboard(players);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('mid_game_leaderboard', ({ leaderboard: lb, questionsRemaining: qr }) => {
      setStatus('mid_leaderboard');
      setLeaderboard(lb);
      setQuestionsRemaining(qr);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on('game_finished', (players: Player[]) => {
      setStatus('finished');
      setLeaderboard(players);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    });

    return () => {
      socket.off('game_state');
      socket.off('question_started');
      socket.off('player_answered');
      socket.off('leaderboard_shown');
      socket.off('mid_game_leaderboard');
      socket.off('game_finished');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pin]);

  const handleNext = () => {
    const socket = getSocket();
    socket.emit('next_question', pin);
  };

  const handleContinueFromLeaderboard = () => {
    const socket = getSocket();
    socket.emit('continue_from_leaderboard', pin);
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-2xl font-bold">
      <div className="text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full mx-auto mb-4"
        />
        Starting game...
      </div>
    </div>;
  }

  const timerColor = timeRemaining <= 5 ? 'text-red-500' : timeRemaining <= 10 ? 'text-amber-500' : 'text-indigo-600';
  const timerBg = timeRemaining <= 5 ? 'bg-red-100 ring-red-400' : timeRemaining <= 10 ? 'bg-amber-100 ring-amber-400' : 'bg-indigo-100 ring-indigo-300';

  return (
    <main className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">

      {status === 'question_active' && currentQuestion && (
        <motion.div 
          key="question"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col h-full"
        >
          {/* Top bar */}
          <div className="flex justify-between items-center px-8 py-4 bg-gray-900">
            <motion.div 
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-xl font-bold text-gray-400"
            >
              Question {questionIndex + 1} of {totalQuestions}
            </motion.div>
            <motion.div 
              key={timeRemaining}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className={`text-4xl font-black ${timerColor} ${timerBg} ring-4 px-6 py-2 rounded-2xl min-w-[100px] text-center`}
            >
              {timeRemaining}s
            </motion.div>
            <motion.div 
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-xl font-bold text-gray-400"
            >
              {answersCount} / {totalPlayers} Answers
            </motion.div>
          </div>

          {/* Question text — centered, takes available space */}
          <div className="flex-1 flex items-center justify-center px-8 py-4 min-h-0">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-center text-white leading-tight max-w-5xl"
            >
              {currentQuestion.text}
            </motion.h1>
          </div>

          {/* Options grid — fixed height, always visible */}
          <div className="grid grid-cols-2 gap-4 px-6 pb-6 shrink-0">
            {currentQuestion.options.map((option, idx) => {
              const Icon = idx === 0 ? Triangle : idx === 1 ? Diamond : idx === 2 ? Circle : Square;
              return (
                <motion.div 
                  key={option.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.08, type: 'spring', stiffness: 300 }}
                  className={`${option.color} rounded-2xl shadow-lg flex items-center p-5 md:p-6 gap-4 ring-2 ring-white/10 hover:ring-white/30 transition-all`}
                >
                  <Icon className="w-10 h-10 text-white fill-white shrink-0 opacity-80" />
                  <span className="text-white text-xl md:text-2xl font-bold flex-1 leading-snug">{option.text}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {status === 'leaderboard' && (
        <motion.div 
          key="leaderboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-gray-800"
        >
          <motion.h2 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black text-white mb-10"
          >
            Leaderboard
          </motion.h2>
          
          <div className="w-full max-w-3xl rounded-3xl overflow-hidden mb-10">
            {leaderboard.slice(0, 5).map((player, idx) => {
              const barColors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500', 'bg-indigo-500', 'bg-indigo-400'];
              return (
                <motion.div 
                  initial={{ x: -80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.12, type: 'spring', stiffness: 200 }}
                  key={player.id}
                  className={`flex justify-between items-center p-5 mb-2 rounded-xl ${idx === 0 ? 'bg-yellow-500/20 ring-2 ring-yellow-500/40' : 'bg-white/5'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-full ${barColors[idx] || 'bg-gray-500'} flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                      {idx + 1}
                    </div>
                    <span className="text-3xl">{player.avatar || '😊'}</span>
                    <span className="text-2xl font-bold text-white">{player.nickname}</span>
                  </div>
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.12 + 0.3 }}
                    className="text-2xl font-black text-indigo-400"
                  >
                    {player.score}
                  </motion.span>
                </motion.div>
              );
            })}
          </div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-2xl font-bold rounded-2xl shadow-xl transition-colors"
          >
            Next Question →
          </motion.button>
        </motion.div>
      )}

      {status === 'mid_leaderboard' && (
        <motion.div 
          key="mid_leaderboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-900 via-indigo-800 to-violet-900 text-white"
        >
          <motion.div 
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-7xl mb-4"
          >
            🏆
          </motion.div>
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-2"
          >
            Leaderboard Check!
          </motion.h2>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-xl text-indigo-300 mb-8"
          >
            {questionsRemaining} questions remaining
          </motion.p>
          
          <div className="w-full max-w-3xl rounded-3xl overflow-hidden mb-10">
            {leaderboard.slice(0, 5).map((player, idx) => (
              <motion.div 
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 + idx * 0.12, type: 'spring', stiffness: 200 }}
                key={player.id}
                className={`flex justify-between items-center p-5 mb-2 rounded-xl ${idx === 0 ? 'bg-yellow-400/20 ring-2 ring-yellow-400/40' : 'bg-white/5'}`}
              >
                <div className="flex items-center gap-5">
                  <span className="text-2xl font-black w-10 text-center">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                  </span>
                  <span className="text-3xl">{player.avatar || '😊'}</span>
                  <span className="text-2xl font-bold">{player.nickname}</span>
                </div>
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.12 + 0.3 }}
                  className="text-2xl font-black text-yellow-300"
                >
                  {player.score}
                </motion.span>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleContinueFromLeaderboard}
            className="px-12 py-4 bg-white text-indigo-700 hover:bg-gray-100 text-2xl font-bold rounded-2xl shadow-xl transition-colors"
          >
            Continue Quiz →
          </motion.button>
        </motion.div>
      )}

      {status === 'finished' && (
        <motion.div 
          key="finished"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 via-indigo-950 to-gray-900 text-white overflow-hidden"
        >
          <motion.h1 
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl font-black mb-12"
          >
            🎉 Final Podium
          </motion.h1>
          
          <div className="flex items-end justify-center gap-6 md:gap-10 mb-12">
            {/* 2nd Place */}
            {leaderboard[1] && (
              <motion.div 
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 120 }}
                className="flex flex-col items-center"
              >
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                  className="text-5xl mb-2"
                >
                  {leaderboard[1].avatar || '😊'}
                </motion.div>
                <div className="text-xl font-bold mb-1 text-gray-300">{leaderboard[1].nickname}</div>
                <div className="text-lg font-semibold text-gray-400 mb-3">{leaderboard[1].score} pts</div>
                <div className="w-28 md:w-36 h-40 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-xl flex items-start justify-center pt-4 shadow-2xl ring-2 ring-gray-300/30">
                  <span className="text-4xl">🥈</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {leaderboard[0] && (
              <motion.div 
                initial={{ y: 300, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, type: 'spring', stiffness: 120 }}
                className="flex flex-col items-center z-10"
              >
                <motion.div 
                  animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-6xl mb-2"
                >
                  {leaderboard[0].avatar || '😊'}
                </motion.div>
                <div className="text-2xl font-black mb-1 text-yellow-300">{leaderboard[0].nickname}</div>
                <div className="text-xl font-bold text-yellow-400/80 mb-3">{leaderboard[0].score} pts</div>
                <div className="w-36 md:w-44 h-56 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-xl flex items-start justify-center pt-4 shadow-2xl ring-2 ring-yellow-300/50">
                  <span className="text-5xl">🥇</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {leaderboard[2] && (
              <motion.div 
                initial={{ y: 150, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
                className="flex flex-col items-center"
              >
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}
                  className="text-5xl mb-2"
                >
                  {leaderboard[2].avatar || '😊'}
                </motion.div>
                <div className="text-xl font-bold mb-1 text-orange-300">{leaderboard[2].nickname}</div>
                <div className="text-lg font-semibold text-orange-400/80 mb-3">{leaderboard[2].score} pts</div>
                <div className="w-28 md:w-36 h-28 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-xl flex items-start justify-center pt-4 shadow-2xl ring-2 ring-orange-300/30">
                  <span className="text-4xl">🥉</span>
                </div>
              </motion.div>
            )}
          </div>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="px-10 py-4 bg-white text-indigo-700 hover:bg-gray-100 text-xl font-bold rounded-2xl shadow-xl transition-colors"
          >
            Back to Home
          </motion.button>
        </motion.div>
      )}

      </AnimatePresence>
    </main>
  );
}
