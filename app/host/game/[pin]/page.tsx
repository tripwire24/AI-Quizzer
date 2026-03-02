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
  score: number;
  hasAnswered: boolean;
  lastAnswerCorrect: boolean;
}

export default function HostGame() {
  const params = useParams();
  const router = useRouter();
  const pin = params.pin as string;
  
  const [status, setStatus] = useState<'question_active' | 'leaderboard' | 'finished'>('question_active');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('question_started', ({ questionIndex, question, totalQuestions }) => {
      setStatus('question_active');
      setCurrentQuestion(question);
      setQuestionIndex(questionIndex);
      setTotalQuestions(totalQuestions);
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

    socket.on('player_answered', ({ totalAnswers, totalPlayers }) => {
      setAnswersCount(totalAnswers);
      setTotalPlayers(totalPlayers);
      
      // If everyone answered, stop timer and show leaderboard
      if (totalAnswers === totalPlayers) {
        if (timerRef.current) clearInterval(timerRef.current);
        socket.emit('show_leaderboard', pin);
      }
    });

    socket.on('leaderboard_shown', (players: Player[]) => {
      setStatus('leaderboard');
      setLeaderboard(players);
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
      socket.off('question_started');
      socket.off('player_answered');
      socket.off('leaderboard_shown');
      socket.off('game_finished');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pin]);

  const handleNext = () => {
    const socket = getSocket();
    socket.emit('next_question', pin);
  };

  if (!currentQuestion && status !== 'finished') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-2xl font-bold">Loading question...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {status === 'question_active' && currentQuestion && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex-1 flex flex-col p-8 max-w-6xl mx-auto w-full"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="text-2xl font-bold text-gray-500">Question {questionIndex + 1} of {totalQuestions}</div>
            <div className="text-4xl font-black text-indigo-600 bg-indigo-100 px-6 py-3 rounded-2xl shadow-sm">
              {timeRemaining}s
            </div>
            <div className="text-2xl font-bold text-gray-500">{answersCount} / {totalPlayers} Answers</div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center mb-12">
            <h1 className="text-5xl md:text-6xl font-black text-center text-gray-900 leading-tight">
              {currentQuestion.text}
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-6 h-64">
            {currentQuestion.options.map((option, idx) => {
              const Icon = idx === 0 ? Triangle : idx === 1 ? Diamond : idx === 2 ? Circle : Square;
              return (
                <div 
                  key={option.id}
                  className={`${option.color} rounded-2xl shadow-lg flex items-center p-8 transform transition-transform hover:scale-[1.02] gap-6`}
                >
                  <Icon className="w-12 h-12 text-white fill-white shrink-0" />
                  <span className="text-white text-3xl font-bold flex-1">{option.text}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {status === 'leaderboard' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center p-8"
        >
          <h2 className="text-5xl font-black text-gray-900 mb-12">Leaderboard</h2>
          
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden mb-12">
            {leaderboard.slice(0, 5).map((player, idx) => (
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                key={player.id}
                className={`flex justify-between items-center p-6 border-b border-gray-100 ${idx === 0 ? 'bg-yellow-50' : ''}`}
              >
                <div className="flex items-center gap-6">
                  <span className={`text-2xl font-black ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                    #{idx + 1}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{player.nickname}</span>
                </div>
                <span className="text-2xl font-black text-indigo-600">{player.score}</span>
              </motion.div>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-2xl font-bold rounded-2xl shadow-xl transition-all active:scale-95"
          >
            Next
          </button>
        </motion.div>
      )}

      {status === 'finished' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center p-8 bg-indigo-600 text-white"
        >
          <h1 className="text-6xl font-black mb-16">Final Podium</h1>
          
          <div className="flex items-end justify-center gap-8 h-96 mb-16">
            {/* 2nd Place */}
            {leaderboard[1] && (
              <motion.div 
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="flex flex-col items-center"
              >
                <div className="text-2xl font-bold mb-4">{leaderboard[1].nickname}</div>
                <div className="text-xl font-semibold mb-2">{leaderboard[1].score}</div>
                <div className="w-32 h-48 bg-gray-300 rounded-t-xl flex items-start justify-center pt-4 shadow-2xl">
                  <span className="text-4xl font-black text-gray-500">2</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {leaderboard[0] && (
              <motion.div 
                initial={{ y: 300, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, type: 'spring' }}
                className="flex flex-col items-center z-10"
              >
                <div className="text-3xl font-black mb-4 text-yellow-300">{leaderboard[0].nickname}</div>
                <div className="text-2xl font-bold mb-2">{leaderboard[0].score}</div>
                <div className="w-40 h-64 bg-yellow-400 rounded-t-xl flex items-start justify-center pt-4 shadow-2xl">
                  <span className="text-5xl font-black text-yellow-600">1</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {leaderboard[2] && (
              <motion.div 
                initial={{ y: 150, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="flex flex-col items-center"
              >
                <div className="text-2xl font-bold mb-4">{leaderboard[2].nickname}</div>
                <div className="text-xl font-semibold mb-2">{leaderboard[2].score}</div>
                <div className="w-32 h-32 bg-orange-400 rounded-t-xl flex items-start justify-center pt-4 shadow-2xl">
                  <span className="text-4xl font-black text-orange-700">3</span>
                </div>
              </motion.div>
            )}
          </div>

          <button
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-white text-indigo-600 hover:bg-gray-100 text-xl font-bold rounded-xl shadow-lg transition-all active:scale-95"
          >
            Back to Home
          </button>
        </motion.div>
      )}
    </main>
  );
}
