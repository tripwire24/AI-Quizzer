import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import express from 'express';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory game state
interface Player {
  id: string;
  socketId: string;
  nickname: string;
  score: number;
  hasAnswered: boolean;
  lastAnswerCorrect: boolean;
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
}

const sessions: Record<string, GameSession> = {};

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
      };
      socket.join(pin);
      socket.emit('game_created', pin);
      console.log(`Game created with PIN: ${pin}`);
    });

    // Player joins a game
    socket.on('join_game', ({ pin, nickname }) => {
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
        
        // Reset player answer states
        Object.values(session.players).forEach(p => {
          p.hasAnswered = false;
          p.lastAnswerCorrect = false;
        });

        const currentQuestion = session.questions[0];
        
        // Send question to everyone
        io.to(pin).emit('question_started', {
          questionIndex: 0,
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
          session.status = 'question_active';
          // Reset player answer states
          Object.values(session.players).forEach(p => {
            p.hasAnswered = false;
            p.lastAnswerCorrect = false;
          });

          const currentQuestion = session.questions[session.currentQuestionIndex];
          io.to(pin).emit('question_started', {
            questionIndex: session.currentQuestionIndex,
            question: currentQuestion,
            totalQuestions: session.questions.length
          });
        }
      }
    });

    // Host shows leaderboard
    socket.on('show_leaderboard', (pin) => {
      const session = sessions[pin];
      if (session && session.hostSocketId === socket.id) {
        session.status = 'leaderboard';
        io.to(pin).emit('leaderboard_shown', Object.values(session.players).sort((a, b) => b.score - a.score));
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
      
      if (selectedOption?.isCorrect) {
        player.lastAnswerCorrect = true;
        // Calculate score based on time remaining (max 1000 points)
        const timeRatio = timeRemaining / currentQuestion.timeLimit;
        const points = Math.round(500 + (500 * timeRatio));
        player.score += points;
      } else {
        player.lastAnswerCorrect = false;
      }

      // Notify player of their result
      socket.emit('answer_result', {
        isCorrect: player.lastAnswerCorrect,
        score: player.score
      });

      // Notify host that someone answered
      io.to(session.hostSocketId).emit('player_answered', {
        totalAnswers: Object.values(session.players).filter(p => p.hasAnswered).length,
        totalPlayers: Object.keys(session.players).length
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
