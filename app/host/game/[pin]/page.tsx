'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  speedLabel?: string;
  speedBonus?: number;
}

interface PlayerStatus {
  nickname: string;
  avatar: string;
  hasAnswered: boolean;
  answerOrder: number;
  isCorrect: boolean;
  speedLabel: string | null;
}

// Music tracks — drop .mp3 files into /public/music/
const MUSIC_TRACKS = [
  '/music/track1.mp3',
  '/music/track2.mp3',
  '/music/track3.mp3',
  '/music/track4.mp3',
  '/music/track5.mp3',
  '/music/track6.mp3',
  '/music/track7.mp3',
  '/music/track8.mp3',
  '/music/track9.mp3',
  '/music/track10.mp3',
];

const getIcon = (idx: number) =>
  idx === 0 ? Triangle : idx === 1 ? Diamond : idx === 2 ? Circle : Square;

export default function HostGame() {
  const params = useParams();
  const router = useRouter();
  const pin = params.pin as string;

  const [status, setStatus] = useState<
    'loading' | 'question_active' | 'answer_reveal' | 'leaderboard' | 'mid_leaderboard' | 'finished'
  >('loading');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answersCount, setAnswersCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [questionsRemaining, setQuestionsRemaining] = useState(0);
  const [playerStatuses, setPlayerStatuses] = useState<PlayerStatus[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const revealShownRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const lastTrackRef = useRef(-1);

  /* ── Music ────────────────────────────────────── */
  const playMusic = useCallback(() => {
    try {
      if (musicRef.current) musicRef.current.pause();
      let idx: number;
      do {
        idx = Math.floor(Math.random() * MUSIC_TRACKS.length);
      } while (idx === lastTrackRef.current && MUSIC_TRACKS.length > 1);
      lastTrackRef.current = idx;
      const audio = new Audio(MUSIC_TRACKS[idx]);
      audio.volume = 0.7;
      audio.loop = true;
      audio.play().catch(() => {});
      musicRef.current = audio;
    } catch {
      /* no music files — silent fail */
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (!musicRef.current) return;
    const audio = musicRef.current;
    musicRef.current = null;
    const fade = setInterval(() => {
      if (audio.volume > 0.05) {
        audio.volume = Math.max(0, audio.volume - 0.05);
      } else {
        clearInterval(fade);
        audio.pause();
        audio.currentTime = 0;
      }
    }, 50);
  }, []);

  /* ── Socket setup ─────────────────────────────── */
  useEffect(() => {
    const socket = getSocket();
    socket.emit('get_game_state', pin);

    /** Emit show_leaderboard once — server orchestrates reveal → leaderboard */
    const emitShowLeaderboard = () => {
      if (revealShownRef.current) return;
      revealShownRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      socket.emit('show_leaderboard', pin);
    };

    /* initial game state */
    socket.on(
      'game_state',
      ({ questionIndex: qIdx, question, totalQuestions: total, players }: {
        status: string; questionIndex: number; question: Question; totalQuestions: number; players: Player[];
        leaderboard: Player[];
      }) => {
        setStatus('question_active');
        setCurrentQuestion(question);
        setQuestionIndex(qIdx);
        setTotalQuestions(total);
        setTimeRemaining(question.timeLimit);
        setTotalPlayers(players.length);
        setAnswersCount(0);
        revealShownRef.current = false;
        playMusic();
        setPlayerStatuses(
          players.map((p) => ({
            nickname: p.nickname,
            avatar: p.avatar,
            hasAnswered: false,
            answerOrder: 0,
            isCorrect: false,
            speedLabel: null,
          })),
        );

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
    );

    /* new question */
    socket.on(
      'question_started',
      ({ questionIndex: qIdx, question, totalQuestions: total }: {
        questionIndex: number; question: Question; totalQuestions: number;
      }) => {
        setStatus('question_active');
        setCurrentQuestion(question);
        setQuestionIndex(qIdx);
        setTotalQuestions(total);
        setTimeRemaining(question.timeLimit);
        setAnswersCount(0);
        revealShownRef.current = false;
        playMusic();
        setPlayerStatuses((prev) =>
          prev.map((p) => ({ ...p, hasAnswered: false, answerOrder: 0, isCorrect: false, speedLabel: null })),
        );

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
    );

    /* player answered — update tracker */
    socket.on(
      'player_answered',
      ({ totalAnswers, totalPlayers: tp, playerStatuses: ps }: {
        totalAnswers: number; totalPlayers: number; playerStatuses?: PlayerStatus[];
      }) => {
        setAnswersCount(totalAnswers);
        setTotalPlayers(tp);
        if (ps) setPlayerStatuses(ps);
        if (totalAnswers === tp) {
          emitShowLeaderboard();
        }
      },
    );

    /* answer reveal from server */
    socket.on(
      'answer_reveal',
      ({ correctAnswer, speedWinners }: {
        correctAnswer: { id: string; text: string; color: string } | null;
        speedWinners: { nickname: string; avatar: string; label: string }[];
      }) => {
        setStatus('answer_reveal');
        // Store reveal data in the playerStatuses for display
        if (speedWinners?.length) {
          setPlayerStatuses((prev) => {
            const updated = [...prev];
            speedWinners.forEach((sw) => {
              const idx = updated.findIndex((p) => p.nickname === sw.nickname);
              if (idx >= 0) updated[idx] = { ...updated[idx], speedLabel: sw.label };
            });
            return updated;
          });
        }
      },
    );

    /* leaderboard (arrives ~3.5 s after reveal) */
    socket.on('leaderboard_shown', (data: { players: Player[] } | Player[]) => {
      const players = Array.isArray(data) ? data : data.players;
      setStatus('leaderboard');
      setLeaderboard(players);
      stopMusic();
      if (timerRef.current) clearInterval(timerRef.current);
    });

    /* mid-game leaderboard */
    socket.on(
      'mid_game_leaderboard',
      ({ leaderboard: lb, questionsRemaining: qr }: { leaderboard: Player[]; questionsRemaining: number }) => {
        setStatus('mid_leaderboard');
        setLeaderboard(lb);
        setQuestionsRemaining(qr);
        if (timerRef.current) clearInterval(timerRef.current);
      },
    );

    /* game over */
    socket.on('game_finished', (players: Player[]) => {
      setStatus('finished');
      setLeaderboard(players);
      stopMusic();
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    });

    return () => {
      socket.off('game_state');
      socket.off('question_started');
      socket.off('player_answered');
      socket.off('answer_reveal');
      socket.off('leaderboard_shown');
      socket.off('mid_game_leaderboard');
      socket.off('game_finished');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pin, playMusic, stopMusic]);

  /* ── Timer-zero → tell server to show leaderboard ── */
  useEffect(() => {
    if (timeRemaining === 0 && status === 'question_active' && !revealShownRef.current) {
      revealShownRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      getSocket().emit('show_leaderboard', pin);
    }
  }, [timeRemaining, status, pin]);

  /* cleanup music on unmount */
  useEffect(
    () => () => {
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
    },
    [],
  );

  /* ── Handlers ─────────────────────────────────── */
  const handleNext = () => {
    stopMusic();
    getSocket().emit('next_question', pin);
  };
  const handleContinueFromLeaderboard = () => {
    stopMusic();
    getSocket().emit('continue_from_leaderboard', pin);
  };

  /* ── Helpers ──────────────────────────────────── */
  const timerColor =
    timeRemaining <= 5 ? 'text-red-500' : timeRemaining <= 10 ? 'text-amber-500' : 'text-indigo-600';
  const timerBg =
    timeRemaining <= 5
      ? 'bg-red-100 ring-red-400'
      : timeRemaining <= 10
        ? 'bg-amber-100 ring-amber-400'
        : 'bg-indigo-100 ring-indigo-300';

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-2xl font-bold">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-12 h-12 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full mx-auto mb-4"
          />
          Starting game…
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════ */
  /* ── RENDER ──────────────────────────────────── */
  /* ═══════════════════════════════════════════════ */
  return (
    <main className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ─── QUESTION ─────────────────────────────── */}
        {status === 'question_active' && currentQuestion && (
          <motion.div
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full"
          >
            {/* Top bar */}
            <div className="flex justify-between items-center px-8 py-4 bg-gray-900 shrink-0">
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

            {/* Main area: sidebar + question */}
            <div className="flex flex-1 min-h-0">
              {/* ── Player vote tracker ── */}
              <div className="w-56 shrink-0 bg-gray-800/50 border-r border-gray-700 overflow-y-auto px-3 py-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Players
                </h3>
                <div className="space-y-1.5">
                  {[...playerStatuses]
                    .sort((a, b) => {
                      if (a.hasAnswered && !b.hasAnswered) return -1;
                      if (!a.hasAnswered && b.hasAnswered) return 1;
                      if (a.hasAnswered && b.hasAnswered) return a.answerOrder - b.answerOrder;
                      return 0;
                    })
                    .map((p) => (
                      <motion.div
                        key={p.nickname}
                        layout
                        initial={false}
                        animate={{
                          opacity: p.hasAnswered ? 1 : 0.4,
                          scale: p.hasAnswered ? 1 : 0.95,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                          p.hasAnswered
                            ? 'bg-indigo-500/20 ring-1 ring-indigo-500/30'
                            : 'bg-gray-700/30'
                        }`}
                      >
                        <span className="text-lg shrink-0">{p.avatar}</span>
                        <span
                          className={`text-sm font-semibold truncate flex-1 ${
                            p.hasAnswered ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {p.nickname}
                        </span>
                        {p.hasAnswered && p.answerOrder === 1 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500 }}
                            className="text-yellow-400 text-sm"
                          >
                            ⭐
                          </motion.span>
                        )}
                        {p.hasAnswered && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring' }}
                            className="text-green-400 text-xs font-bold"
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                </div>
              </div>

              {/* ── Question + Options ── */}
              <div className="flex-1 flex flex-col min-h-0">
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

                <div className="grid grid-cols-2 gap-4 px-6 pb-6 shrink-0">
                  {currentQuestion.options.map((option, idx) => {
                    const Icon = getIcon(idx);
                    return (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.08, type: 'spring', stiffness: 300 }}
                        className={`${option.color} rounded-2xl shadow-lg flex items-center p-5 md:p-6 gap-4 ring-2 ring-white/10 hover:ring-white/30 transition-all`}
                      >
                        <Icon className="w-10 h-10 text-white fill-white shrink-0 opacity-80" />
                        <span className="text-white text-xl md:text-2xl font-bold flex-1 leading-snug">
                          {option.text}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── ANSWER REVEAL ────────────────────────── */}
        {status === 'answer_reveal' && currentQuestion && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-8"
          >
            <motion.h2
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="text-4xl md:text-5xl font-black text-white mb-10"
            >
              ✨ Correct Answer
            </motion.h2>

            {currentQuestion.options
              .filter((o) => o.isCorrect)
              .map((option) => {
                const optIdx = currentQuestion.options.indexOf(option);
                const Icon = getIcon(optIdx);
                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, scale: 0.3, y: 60 }}
                    animate={{ opacity: 1, scale: [1, 1.03, 1], y: 0 }}
                    transition={{
                      duration: 0.6,
                      scale: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
                    }}
                    className={`${option.color} rounded-3xl shadow-2xl flex items-center p-8 md:p-10 gap-6 ring-4 ring-green-400/60 max-w-3xl w-full`}
                  >
                    <Icon className="w-14 h-14 text-white fill-white shrink-0 opacity-90" />
                    <span className="text-white text-3xl md:text-4xl font-black flex-1 leading-snug">
                      {option.text}
                    </span>
                    <motion.span
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                      className="text-5xl"
                    >
                      ✅
                    </motion.span>
                  </motion.div>
                );
              })}

            {/* Speed winner badges */}
            {playerStatuses.some((p) => p.speedLabel) && (
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                {playerStatuses
                  .filter((p) => p.speedLabel)
                  .sort((a, b) => a.answerOrder - b.answerOrder)
                  .map((p, idx) => (
                    <motion.div
                      key={p.nickname}
                      initial={{ opacity: 0, y: 30, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.8 + idx * 0.25, type: 'spring' }}
                      className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl ring-1 ring-white/20"
                    >
                      <span className="text-3xl">{p.avatar}</span>
                      <div>
                        <div className="text-white font-bold text-lg">{p.nickname}</div>
                        <div className="text-yellow-400 font-semibold text-sm">{p.speedLabel}</div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── LEADERBOARD ──────────────────────────── */}
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
                const barColors = [
                  'bg-yellow-500',
                  'bg-gray-400',
                  'bg-orange-500',
                  'bg-indigo-500',
                  'bg-indigo-400',
                ];
                return (
                  <motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.12, type: 'spring', stiffness: 200 }}
                    key={player.id}
                    className={`flex justify-between items-center p-5 mb-2 rounded-xl ${
                      idx === 0 ? 'bg-yellow-500/20 ring-2 ring-yellow-500/40' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-10 h-10 rounded-full ${
                          barColors[idx] || 'bg-gray-500'
                        } flex items-center justify-center text-white font-black text-lg shadow-lg`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-3xl">{player.avatar || '😊'}</span>
                      <div>
                        <span className="text-2xl font-bold text-white">{player.nickname}</span>
                        {player.speedLabel && (
                          <div className="text-yellow-400 text-sm font-semibold">{player.speedLabel}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.12 + 0.3 }}
                        className="text-2xl font-black text-indigo-400 block"
                      >
                        {player.score}
                      </motion.span>
                      {(player.speedBonus ?? 0) > 0 && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.12 + 0.5 }}
                          className="text-green-400 text-sm font-bold"
                        >
                          +{player.speedBonus} bonus
                        </motion.span>
                      )}
                    </div>
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

        {/* ─── MID-GAME LEADERBOARD ────────────────── */}
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
                  className={`flex justify-between items-center p-5 mb-2 rounded-xl ${
                    idx === 0 ? 'bg-yellow-400/20 ring-2 ring-yellow-400/40' : 'bg-white/5'
                  }`}
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

        {/* ─── FINAL PODIUM ─────────────────────────── */}
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
                  <div className="text-lg font-semibold text-gray-400 mb-3">
                    {leaderboard[1].score} pts
                  </div>
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
                  <div className="text-2xl font-black mb-1 text-yellow-300">
                    {leaderboard[0].nickname}
                  </div>
                  <div className="text-xl font-bold text-yellow-400/80 mb-3">
                    {leaderboard[0].score} pts
                  </div>
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
                  <div className="text-lg font-semibold text-orange-400/80 mb-3">
                    {leaderboard[2].score} pts
                  </div>
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
