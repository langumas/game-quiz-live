import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { StorageRepository } from './storage.js';
import { GameEngine } from './gameEngine.js';
import { TikTokLiveAdapter } from './tiktokAdapter.js';
import { Category, GameConfig, GiftConfig, Question } from '../shared/types.js';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const storage = new StorageRepository();
const engine = new GameEngine(storage);
const tiktok = new TikTokLiveAdapter();

// Connect TikTokLiveAdapter events to GameEngine
tiktok.on('status', (status) => {
  engine.setTikTokStatus(status);
});

tiktok.on('comment', (event) => {
  engine.handleComment(event);
});

tiktok.on('like', (event) => {
  engine.handleLike(event);
});

tiktok.on('gift', (event) => {
  engine.handleGift(event);
});

// Broadcast GameEngine state and event logs to all Socket.IO clients
engine.on('state_update', (state) => {
  io.emit('game:state', state);
});

engine.on('event_log', (log) => {
  io.emit('game:log', log);
});

// REST API for initial data & CRUD
app.get('/api/bootstrap', (_req, res) => {
  res.json({
    state: engine.getLiveState(),
    questions: storage.getQuestions(),
    categories: storage.getCategories(),
    gifts: storage.getGifts(),
    config: storage.getConfig(),
    logs: engine.getEventLogs(),
    supabaseConfigured: storage.isSupabaseConfigured(),
  });
});

io.on('connection', (socket) => {
  // Send initial payload immediately
  socket.emit('game:bootstrap', {
    state: engine.getLiveState(),
    questions: storage.getQuestions(),
    categories: storage.getCategories(),
    gifts: storage.getGifts(),
    config: storage.getConfig(),
    logs: engine.getEventLogs(),
  });

  // Match control commands
  socket.on('admin:start_match', (payload?: { questionId?: string }) => {
    engine.startMatch(payload?.questionId);
  });

  socket.on('admin:next_question', (payload?: { questionId?: string }) => {
    engine.nextQuestion(payload?.questionId);
  });

  socket.on('admin:pause_match', () => {
    engine.pauseMatch();
  });

  socket.on('admin:reveal_answer', () => {
    engine.revealAnswer();
  });

  socket.on('admin:end_match', () => {
    engine.endMatch();
  });

  socket.on('admin:return_lobby', () => {
    engine.returnToLobby();
  });

  // Config & Data Management
  socket.on('admin:update_config', (partial: Partial<GameConfig>) => {
    const updated = storage.updateConfig(partial);
    io.emit('data:config', updated);
    engine.broadcastState();
  });

  socket.on('admin:save_question', (question: Question) => {
    const questions = storage.addOrUpdateQuestion(question);
    io.emit('data:questions', questions);
  });

  socket.on('admin:delete_question', (id: string) => {
    const questions = storage.deleteQuestion(id);
    io.emit('data:questions', questions);
  });

  socket.on('admin:save_categories', (categories: Category[]) => {
    const updated = storage.saveCategories(categories);
    io.emit('data:categories', updated);
    engine.broadcastState();
  });

  socket.on('admin:save_gifts', (gifts: GiftConfig[]) => {
    const updated = storage.saveGifts(gifts);
    io.emit('data:gifts', updated);
  });

  // Participant & Ranking Management
  socket.on(
    'admin:adjust_score',
    (payload: { uniqueId: string; delta: number }) => {
      engine.adjustParticipantScore(payload.uniqueId, payload.delta);
    }
  );

  socket.on('admin:remove_participant', (uniqueId: string) => {
    engine.removeParticipant(uniqueId);
  });

  socket.on('admin:reset_leaderboard', () => {
    engine.resetLeaderboard();
  });

  // TikTok LIVE Connection
  socket.on('tiktok:connect', async (username: string, callback?: (res: any) => void) => {
    try {
      const status = await tiktok.connect(username);
      if (callback) callback({ ok: true, status });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al conectar';
      if (callback) callback({ ok: false, error: errorMsg });
    }
  });

  socket.on('tiktok:disconnect', async (callback?: (res: any) => void) => {
    const status = await tiktok.disconnect();
    if (callback) callback({ ok: true, status });
  });

  // Simulation Mode Events (strictly manual test triggers when testing)
  socket.on(
    'sim:comment',
    (payload: { uniqueId: string; nickname: string; comment: string }) => {
      engine.handleComment({
        uniqueId: payload.uniqueId.trim() || 'tester_1',
        nickname: payload.nickname.trim() || payload.uniqueId || 'Jugador Test',
        comment: payload.comment,
        source: 'simulation',
      });
    }
  );

  socket.on(
    'sim:like',
    (payload: { uniqueId: string; nickname: string; likeCount: number }) => {
      engine.handleLike({
        uniqueId: payload.uniqueId.trim() || 'tester_1',
        nickname: payload.nickname.trim() || payload.uniqueId || 'Jugador Test',
        likeCount: Number(payload.likeCount) || 25,
        source: 'simulation',
      });
    }
  );

  socket.on(
    'sim:gift',
    (payload: {
      uniqueId: string;
      nickname: string;
      giftName: string;
      diamondCount: number;
      repeatCount?: number;
    }) => {
      engine.handleGift({
        uniqueId: payload.uniqueId.trim() || 'tester_1',
        nickname: payload.nickname.trim() || payload.uniqueId || 'Jugador Test',
        giftName: payload.giftName,
        diamondCount: Number(payload.diamondCount) || 1,
        repeatCount: Number(payload.repeatCount) || 1,
        source: 'simulation',
      });
    }
  );

  // Batch simulation helper triggered manually by user click to test wave of answers
  socket.on('sim:wave_answers', () => {
    const testPlayers = [
      { uniqueId: 'pixel_hunter', nickname: 'PixelHunter99' },
      { uniqueId: 'valkyrie_gg', nickname: 'Valkyrie_GG' },
      { uniqueId: 'kratos_latam', nickname: 'KratosLatam' },
      { uniqueId: 'zelda_fan', nickname: 'HyruleHero' },
      { uniqueId: 'cyber_ninja', nickname: 'CyberNinjaX' },
      { uniqueId: 'nova_sniper', nickname: 'NovaSniper' },
    ];
    const options = ['A', 'B', 'C', 'D'];
    testPlayers.forEach((p, idx) => {
      setTimeout(() => {
        const currentQ = engine.getLiveState().currentQuestion;
        // Weight slightly toward correct option so testing shows winners & streaks
        const pickCorrect = Math.random() < 0.65 && currentQ;
        const chosenOpt = pickCorrect
          ? currentQ.correctOption
          : options[Math.floor(Math.random() * options.length)];
        engine.handleComment({
          uniqueId: p.uniqueId,
          nickname: p.nickname,
          comment: chosenOpt,
          source: 'simulation',
        });
      }, idx * 350);
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 [Game Quiz Live Server] Escuchando en http://localhost:${PORT}`);
});

