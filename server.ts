import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import express from 'express';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Speed bonus labels for fastest correct answers
const SPEED_LABELS = [
  { label: '⚡ Lightning Fast', bonus: 200 },
  { label: '🤠 Quick Draw', bonus: 150 },
  { label: '🎯 Sharpshooter', bonus: 100 },
];

// In-memory game state
interface Player {
  id: string;
  socketId: string;
  nickname: string;
  avatar: string;
  score: number;
  hasAnswered: boolean;
  lastAnswerCorrect: boolean;
  answerOrder?: number;
  correctOrder?: number;
  speedLabel?: string;
  speedBonus?: number;
}

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; color: string; isCorrect: boolean }[];
  timeLimit: number;
}

interface GameSession {
  pin: string;
  hostSocketId: string;
  status: 'lobby' | 'question_active' | 'leaderboard' | 'finished';
  players: Record<string, Player>;
  questions: Question[];
  currentQuestionIndex: number;
  timer: number;
  answerCount: number;
  correctCount: number;
}

const sessions: Record<string, GameSession> = {};

/** Reset per-question answer tracking for all players */
function resetPlayerAnswerState(session: GameSession) {
  session.answerCount = 0;
  session.correctCount = 0;
  Object.values(session.players).forEach(p => {
    p.hasAnswered = false;
    p.lastAnswerCorrect = false;
    p.answerOrder = undefined;
    p.correctOrder = undefined;
    p.speedLabel = undefined;
    p.speedBonus = undefined;
  });
}

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Host creates a game
    socket.on('create_game', (questions: Question[]) => {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      sessions[pin] = {
        pin,
        hostSocketId: socket.id,
        status: 'lobby',
        players: {},
        questions,
        currentQuestionIndex: 0,
        timer: 0,
        answerCount: 0,
        correctCount: 0,
      };
      socket.join(pin);
      socket.emit('game_created', pin);
      console.log(`Game created with PIN: ${pin}`);
    });

    // Player joins a game
    socket.on('join_game', ({ pin, nickname, avatar }) => {
      const session = sessions[pin];
      if (!session) {
        socket.emit('error', 'Game not found');
        return;
      }
      if (session.status !== 'lobby') {
        socket.emit('error', 'Game already started');
        return;
      }

      const playerId = Math.random().toString(36).substring(2, 9);
      const player: Player = {
        id: playerId,
        socketId: socket.id,
        nickname,
        avatar: avatar || '😊',
        score: 0,
        hasAnswered: false,
        lastAnswerCorrect: false,
      };

      session.players[socket.id] = player;
      socket.join(pin);

      // Notify player they joined
      socket.emit('joined_game', { pin, player });

      // Notify host that a player joined
      io.to(session.hostSocketId).emit('player_joined', Object.values(session.players));
    });

    // Host starts the game
    socket.on('start_game', (pin) => {
      const session = sessions[pin];
      if (session && session.hostSocketId === socket.id) {
        session.status = 'question_active';
        session.currentQuestionIndex = 0;
        resetPlayerAnswerState(session);

        // Emit game_started to host so they know to navigate
        socket.emit('game_started', pin);
      }
    });

    // Host game page requests current state (called when host game page mounts)
    socket.on('get_game_state', (pin) => {
      const session = sessions[pin];
      if (session && session.hostSocketId === socket.id) {
        resetPlayerAnswerState(session);
        const currentQuestion = session.questions[session.currentQuestionIndex];

        // Send current state to the host
        socket.emit('game_state', {
          status: session.status,
          questionIndex: session.currentQuestionIndex,
          question: currentQuestion,
          totalQuestions: session.questions.length,
          players: Object.values(session.players),
          leaderboard: Object.values(session.players).sort((a, b) => b.score - a.score)
        });

        // Also send question_started to all players
        io.to(pin).emit('question_started', {
          questionIndex: session.currentQuestionIndex,
          question: currentQuestion,
          totalQuestions: session.questions.length
        });
      }
    });

    // Host moves to next question
    socket.on('next_question', (pin) => {
      const session = sessions[pin];
      if (session && session.hostSocketId === socket.id) {
        session.currentQuestionIndex++;

        if (session.currentQuestionIndex >= session.questions.length) {
          session.status = 'finished';
          io.to(pin).emit('game_finished', Object.values(session.players).sort((a, b) => b.score - a.score));
        } else {
          // Check if we should show a mid-game leaderboard (every 5 questions)
          if (session.currentQuestionIndex % 5 === 0) {
            session.status = 'leaderboard';
            io.to(pin).emit('mid_game_leaderboard', {
              leaderboard: Object.values(session.players).sort((a, b) => b.score - a.score),
              questionsRemaining: session.questions.length - session.currentQuestionIndex
            });
          } else {
            session.status = 'question_active';
            resetPlayerAnswerState(session);

            const currentQuestion = session.questions[session.currentQuestionIndex];
            io.to(pin).emit('question_started', {
              questionIndex: session.currentQuestionIndex,
              question: currentQuestion,
              totalQuestions: session.questions.length
            });
          }
        }
      }
    });

    // Host continues from mid-game leaderboard
    socket.on('continue_from_leaderboard', (pin) => {
      const session = sessions[pin];
      if (session && session.hostSocketId === socket.id) {
        session.status = 'question_active';
        resetPlayerAnswerState(session);

        const currentQuestion = session.questions[session.currentQuestionIndex];
        io.to(pin).emit('question_started', {
          questionIndex: session.currentQuestionIndex,
          question: currentQuestion,
          totalQuestions: session.questions.length
        });
      }
    });

    // Host shows leaderboard (called after answer reveal finishes)
    socket.on('show_leaderboard', (pin) => {
      const session = sessions[pin];
      if (session && session.hostSocketId === socket.id) {
        session.status = 'leaderboard';
        const currentQuestion = session.questions[session.currentQuestionIndex];
        const correctOption = currentQuestion.options.find(o => o.isCorrect);

        const sortedPlayers = Object.values(session.players).sort((a, b) => b.score - a.score);
        const speedWinners = Object.values(session.players)
          .filter(p => p.speedLabel)
          .sort((a, b) => (a.correctOrder || 99) - (b.correctOrder || 99))
          .map(p => ({ nickname: p.nickname, avatar: p.avatar, label: p.speedLabel }));

        io.to(pin).emit('leaderboard_shown', {
          players: sortedPlayers,
          correctAnswer: correctOption
            ? { id: correctOption.id, text: correctOption.text, color: correctOption.color }
            : null,
          speedWinners,
        });
      }
    });

    // Player submits an answer
    socket.on('submit_answer', ({ pin, answerId, timeRemaining }) => {
      const session = sessions[pin];
      if (!session || session.status !== 'question_active') return;

      const player = session.players[socket.id];
      if (!player || player.hasAnswered) return;

      const currentQuestion = session.questions[session.currentQuestionIndex];
      const selectedOption = currentQuestion.options.find(o => o.id === answerId);

      player.hasAnswered = true;
      session.answerCount++;
      player.answerOrder = session.answerCount;

      let pointsEarned = 0;

      if (selectedOption?.isCorrect) {
        player.lastAnswerCorrect = true;
        session.correctCount++;
        player.correctOrder = session.correctCount;

        // Base score: 500-1000 based on remaining time
        const timeRatio = timeRemaining / currentQuestion.timeLimit;
        pointsEarned = Math.round(500 + (500 * timeRatio));

        // Speed bonus for first 3 correct answers
        if (player.correctOrder <= SPEED_LABELS.length) {
          const speedInfo = SPEED_LABELS[player.correctOrder - 1];
          player.speedLabel = speedInfo.label;
          player.speedBonus = speedInfo.bonus;
          pointsEarned += speedInfo.bonus;
        }

        player.score += pointsEarned;
      } else {
        player.lastAnswerCorrect = false;
      }

      // Notify player of their result
      socket.emit('answer_result', {
        isCorrect: player.lastAnswerCorrect,
        score: player.score,
        pointsEarned,
        speedLabel: player.speedLabel || null,
        speedBonus: player.speedBonus || 0,
      });

      // Notify host with full player statuses
      io.to(session.hostSocketId).emit('player_answered', {
        totalAnswers: Object.values(session.players).filter(p => p.hasAnswered).length,
        totalPlayers: Object.keys(session.players).length,
        playerStatuses: Object.values(session.players).map(p => ({
          nickname: p.nickname,
          avatar: p.avatar,
          hasAnswered: p.hasAnswered,
          answerOrder: p.answerOrder || 0,
          isCorrect: p.hasAnswered ? p.lastAnswerCorrect : false,
          speedLabel: p.speedLabel || null,
        })),
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Handle player disconnect
      for (const pin in sessions) {
        const session = sessions[pin];
        if (session.players[socket.id]) {
          delete session.players[socket.id];
          io.to(session.hostSocketId).emit('player_left', Object.values(session.players));
        }
        // If host disconnects, end game
        if (session.hostSocketId === socket.id) {
          io.to(pin).emit('host_disconnected');
          delete sessions[pin];
        }
      }
    });
  });

  // Keep-alive endpoint (prevents Render free-tier spin-down)
  expressApp.get('/api/ping', (_req, res) => {
    res.json({ ok: true, sessions: Object.keys(sessions).length });
  });

  // Next.js request handling
  expressApp.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
