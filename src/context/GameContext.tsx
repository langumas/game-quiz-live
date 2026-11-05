import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Category,
  GameConfig,
  GiftConfig,
  LiveGameState,
  Question,
  StreamEventLog,
} from '../../shared/types';

interface GameContextValue {
  socketConnected: boolean;
  state: LiveGameState | null;
  questions: Question[];
  categories: Category[];
  gifts: GiftConfig[];
  config: GameConfig | null;
  logs: StreamEventLog[];
  // Match Actions
  startMatch: (questionId?: string) => void;
  nextQuestion: (questionId?: string) => void;
  pauseMatch: () => void;
  revealAnswer: () => void;
  endMatch: () => void;
  returnToLobby: () => void;
  // Data & Config Actions
  updateConfig: (partial: Partial<GameConfig>) => void;
  saveQuestion: (q: Question) => void;
  deleteQuestion: (id: string) => void;
  saveCategories: (cats: Category[]) => void;
  saveGifts: (gifts: GiftConfig[]) => void;
  // Ranking Actions
  adjustScore: (uniqueId: string, delta: number) => void;
  removeParticipant: (uniqueId: string) => void;
  resetLeaderboard: () => void;
  // TikTok Actions
  connectTikTok: (username: string) => Promise<{ ok: boolean; error?: string }>;
  disconnectTikTok: () => Promise<void>;
  // Simulation Actions
  simulateComment: (uniqueId: string, nickname: string, comment: string) => void;
  simulateLike: (uniqueId: string, nickname: string, likeCount: number) => void;
  simulateGift: (
    uniqueId: string,
    nickname: string,
    giftName: string,
    diamondCount: number,
    repeatCount?: number
  ) => void;
  simulateWaveAnswers: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [state, setState] = useState<LiveGameState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [gifts, setGifts] = useState<GiftConfig[]>([]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [logs, setLogs] = useState<StreamEventLog[]>([]);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('game:bootstrap', (payload) => {
      setState(payload.state);
      setQuestions(payload.questions);
      setCategories(payload.categories);
      setGifts(payload.gifts);
      setConfig(payload.config);
      setLogs(payload.logs || []);
    });

    socket.on('game:state', (newState: LiveGameState) => {
      setState(newState);
      if (newState.config) {
        setConfig(newState.config);
      }
    });

    socket.on('game:log', (entry: StreamEventLog) => {
      setLogs((prev) => [entry, ...prev].slice(0, 80));
    });

    socket.on('data:questions', (updated: Question[]) => {
      setQuestions(updated);
    });

    socket.on('data:categories', (updated: Category[]) => {
      setCategories(updated);
    });

    socket.on('data:gifts', (updated: GiftConfig[]) => {
      setGifts(updated);
    });

    socket.on('data:config', (updated: GameConfig) => {
      setConfig(updated);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startMatch = (questionId?: string) => {
    socketRef.current?.emit('admin:start_match', { questionId });
  };

  const nextQuestion = (questionId?: string) => {
    socketRef.current?.emit('admin:next_question', { questionId });
  };

  const pauseMatch = () => {
    socketRef.current?.emit('admin:pause_match');
  };

  const revealAnswer = () => {
    socketRef.current?.emit('admin:reveal_answer');
  };

  const endMatch = () => {
    socketRef.current?.emit('admin:end_match');
  };

  const returnToLobby = () => {
    socketRef.current?.emit('admin:return_lobby');
  };

  const updateConfig = (partial: Partial<GameConfig>) => {
    socketRef.current?.emit('admin:update_config', partial);
  };

  const saveQuestion = (q: Question) => {
    socketRef.current?.emit('admin:save_question', q);
  };

  const deleteQuestion = (id: string) => {
    socketRef.current?.emit('admin:delete_question', id);
  };

  const saveCategories = (cats: Category[]) => {
    socketRef.current?.emit('admin:save_categories', cats);
  };

  const saveGifts = (newGifts: GiftConfig[]) => {
    socketRef.current?.emit('admin:save_gifts', newGifts);
  };

  const adjustScore = (uniqueId: string, delta: number) => {
    socketRef.current?.emit('admin:adjust_score', { uniqueId, delta });
  };

  const removeParticipant = (uniqueId: string) => {
    socketRef.current?.emit('admin:remove_participant', uniqueId);
  };

  const resetLeaderboard = () => {
    socketRef.current?.emit('admin:reset_leaderboard');
  };

  const connectTikTok = (
    username: string
  ): Promise<{ ok: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ ok: false, error: 'Servidor desconectado' });
        return;
      }
      socketRef.current.emit('tiktok:connect', username, (res: any) => {
        resolve(res);
      });
    });
  };

  const disconnectTikTok = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve();
        return;
      }
      socketRef.current.emit('tiktok:disconnect', () => {
        resolve();
      });
    });
  };

  const simulateComment = (
    uniqueId: string,
    nickname: string,
    comment: string
  ) => {
    socketRef.current?.emit('sim:comment', { uniqueId, nickname, comment });
  };

  const simulateLike = (
    uniqueId: string,
    nickname: string,
    likeCount: number
  ) => {
    socketRef.current?.emit('sim:like', { uniqueId, nickname, likeCount });
  };

  const simulateGift = (
    uniqueId: string,
    nickname: string,
    giftName: string,
    diamondCount: number,
    repeatCount = 1
  ) => {
    socketRef.current?.emit('sim:gift', {
      uniqueId,
      nickname,
      giftName,
      diamondCount,
      repeatCount,
    });
  };

  const simulateWaveAnswers = () => {
    socketRef.current?.emit('sim:wave_answers');
  };

  return (
    <GameContext.Provider
      value={{
        socketConnected,
        state,
        questions,
        categories,
        gifts,
        config,
        logs,
        startMatch,
        nextQuestion,
        pauseMatch,
        revealAnswer,
        endMatch,
        returnToLobby,
        updateConfig,
        saveQuestion,
        deleteQuestion,
        saveCategories,
        saveGifts,
        adjustScore,
        removeParticipant,
        resetLeaderboard,
        connectTikTok,
        disconnectTikTok,
        simulateComment,
        simulateLike,
        simulateGift,
        simulateWaveAnswers,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame debe usarse dentro de un GameProvider');
  }
  return ctx;
};

