export type OptionKey = 'A' | 'B' | 'C' | 'D';

export type Difficulty = 'facil' | 'medio' | 'dificil' | 'experto';

export type GamePhase = 'LOBBY' | 'QUESTION' | 'PAUSED' | 'REVEAL' | 'ENDED';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Question {
  id: string;
  text: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  categoryId: string;
  difficulty: Difficulty;
  explanation?: string;
}

export interface Participant {
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
  currentStreak: number;
  bestStreak: number;
  likesSent: number;
  giftsSent: number;
  coinsGiven: number;
  hasStreakShield: boolean;
  lastAnswer?: {
    option: OptionKey;
    isCorrect: boolean;
    pointsEarned: number;
    responseTimeMs: number;
    questionId: string;
  };
}

export type GiftEffectType =
  | 'double_points'
  | 'extra_time'
  | 'fifty_fifty'
  | 'bonus_points'
  | 'streak_shield';

export interface GiftConfig {
  id: string;
  giftName: string;
  giftId?: number;
  coins: number;
  icon: string;
  effectType: GiftEffectType;
  effectValue: number;
  description: string;
  enabled: boolean;
}

export interface GameConfig {
  questionDurationSec: number;
  revealDurationSec: number;
  autoAdvance: boolean;
  pointsByDifficulty: Record<Difficulty, number>;
  speedBonusMax: number;
  firstAnswerBonus: number;
  streakBonusThreshold: number;
  streakBonusPerLevel: number;
  likeGoalTarget: number;
  likeGoalRewardType: 'double_points_round' | 'extra_time_round';
  transparentOverlay: boolean;
  soundEnabled: boolean;
  selectedCategoryFilter: string;
  selectedDifficultyFilter: string;
}

export interface RoundAnswerEntry {
  uniqueId: string;
  nickname: string;
  avatarUrl?: string;
  option: OptionKey;
  timestampMs: number;
  responseTimeMs: number;
  isCorrect?: boolean;
  pointsEarned?: number;
  streakAfter?: number;
  isFirstCorrect?: boolean;
}

export interface ActiveEffectBanner {
  id: string;
  type: GiftEffectType | 'like_goal';
  title: string;
  subtitle: string;
  triggeredBy: string;
  icon: string;
  timestamp: number;
}

export interface StreamEventLog {
  id: string;
  type: 'comment' | 'answer' | 'like' | 'gift' | 'system';
  source: 'tiktok' | 'simulation';
  uniqueId: string;
  nickname: string;
  message: string;
  timestamp: number;
  highlight?: boolean;
}

export interface TikTokConnectionStatus {
  connected: boolean;
  connecting: boolean;
  username: string;
  roomId?: string;
  viewerCount?: number;
  error?: string;
  mode: 'tiktok' | 'simulation';
}

export interface LiveGameState {
  phase: GamePhase;
  roundNumber: number;
  totalRoundsPlayed: number;
  currentQuestion: Question | null;
  currentCategory: Category | null;
  timeRemainingSec: number;
  roundDurationSec: number;
  eliminatedOptions: OptionKey[];
  doublePointsActive: boolean;
  roundAnswersCount: number;
  optionDistribution: Record<OptionKey, number>;
  recentAnswersFeed: Array<{
    uniqueId: string;
    nickname: string;
    option: OptionKey;
    responseTimeMs: number;
  }>;
  roundWinners: RoundAnswerEntry[];
  fastestWinner: RoundAnswerEntry | null;
  activeBanner: ActiveEffectBanner | null;
  totalLikes: number;
  likeGoalProgress: number;
  likeGoalTarget: number;
  likeGoalsCompleted: number;
  leaderboard: Participant[];
  totalParticipants: number;
  tiktokStatus: TikTokConnectionStatus;
  config: GameConfig;
}

