import { EventEmitter } from 'node:events';
import {
  ActiveEffectBanner,
  Category,
  GameConfig,
  GamePhase,
  LiveGameState,
  OptionKey,
  Participant,
  Question,
  RoundAnswerEntry,
  StreamEventLog,
  TikTokConnectionStatus,
} from '../shared/types.js';
import { StorageRepository } from './storage.js';
import {
  IncomingCommentEvent,
  IncomingGiftEvent,
  IncomingLikeEvent,
} from './tiktokAdapter.js';

export class GameEngine extends EventEmitter {
  private storage: StorageRepository;
  private phase: GamePhase = 'LOBBY';
  private roundNumber = 0;
  private totalRoundsPlayed = 0;
  private currentQuestion: Question | null = null;
  private usedQuestionIds: Set<string> = new Set();
  private questionStartedAtMs = 0;
  private timeRemainingSec = 0;
  private roundDurationSec = 20;
  private eliminatedOptions: OptionKey[] = [];
  private doublePointsActive = false;
  private nextRoundDoublePoints = false;
  private nextRoundExtraTimeSec = 0;
  private roundAnswers: Map<string, RoundAnswerEntry> = new Map();
  private roundWinners: RoundAnswerEntry[] = [];
  private fastestWinner: RoundAnswerEntry | null = null;
  private activeBanner: ActiveEffectBanner | null = null;
  private bannerTimeout: NodeJS.Timeout | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private revealTimeout: NodeJS.Timeout | null = null;
  private eventLogs: StreamEventLog[] = [];
  private tiktokStatus: TikTokConnectionStatus = {
    connected: false,
    connecting: false,
    username: '',
    mode: 'simulation',
  };

  constructor(storage: StorageRepository) {
    super();
    this.storage = storage;
  }

  public setTikTokStatus(status: TikTokConnectionStatus): void {
    this.tiktokStatus = status;
    this.broadcastState();
  }

  public getEventLogs(): StreamEventLog[] {
    return this.eventLogs;
  }

  private pushLog(log: Omit<StreamEventLog, 'id' | 'timestamp'>): void {
    const entry: StreamEventLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > 80) {
      this.eventLogs.length = 80;
    }
    this.emit('event_log', entry);
  }

  private showBanner(
    banner: Omit<ActiveEffectBanner, 'id' | 'timestamp'>,
    durationMs = 6000
  ): void {
    if (this.bannerTimeout) {
      clearTimeout(this.bannerTimeout);
    }
    this.activeBanner = {
      ...banner,
      id: `banner-${Date.now()}`,
      timestamp: Date.now(),
    };
    this.broadcastState();

    this.bannerTimeout = setTimeout(() => {
      this.activeBanner = null;
      this.broadcastState();
    }, durationMs);
  }

  public startMatch(questionId?: string): void {
    this.roundNumber = 0;
    this.usedQuestionIds.clear();
    this.nextQuestion(questionId);
  }

  public nextQuestion(specificQuestionId?: string): void {
    this.clearTimers();

    const config = this.storage.getConfig();
    const allQuestions = this.storage.getQuestions();
    if (allQuestions.length === 0) {
      this.phase = 'LOBBY';
      this.broadcastState();
      return;
    }

    let chosen: Question | undefined;
    if (specificQuestionId) {
      chosen = allQuestions.find((q) => q.id === specificQuestionId);
    }

    if (!chosen) {
      let pool = allQuestions.filter((q) => {
        const catMatch =
          config.selectedCategoryFilter === 'all' ||
          q.categoryId === config.selectedCategoryFilter;
        const diffMatch =
          config.selectedDifficultyFilter === 'all' ||
          q.difficulty === config.selectedDifficultyFilter;
        return catMatch && diffMatch;
      });

      if (pool.length === 0) {
        pool = allQuestions;
      }

      let unusedPool = pool.filter((q) => !this.usedQuestionIds.has(q.id));
      if (unusedPool.length === 0) {
        this.usedQuestionIds.clear();
        unusedPool = pool;
      }

      const randomIndex = Math.floor(Math.random() * unusedPool.length);
      chosen = unusedPool[randomIndex];
    }

    if (!chosen) return;

    this.usedQuestionIds.add(chosen.id);
    this.currentQuestion = chosen;
    this.roundNumber += 1;
    this.totalRoundsPlayed += 1;
    this.roundAnswers.clear();
    this.roundWinners = [];
    this.fastestWinner = null;
    this.eliminatedOptions = [];

    const extraSec = this.nextRoundExtraTimeSec;
    this.nextRoundExtraTimeSec = 0;

    this.doublePointsActive = this.nextRoundDoublePoints;
    this.nextRoundDoublePoints = false;

    this.roundDurationSec = config.questionDurationSec + extraSec;
    this.timeRemainingSec = this.roundDurationSec;
    this.questionStartedAtMs = Date.now();
    this.phase = 'QUESTION';

    this.pushLog({
      type: 'system',
      source: this.tiktokStatus.mode,
      uniqueId: 'system',
      nickname: 'GAME SHOW',
      message: `Ronda #${this.roundNumber}: ${chosen.text}`,
      highlight: true,
    });

    this.startQuestionTimer();
    this.broadcastState();
  }

  private startQuestionTimer(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    this.tickInterval = setInterval(() => {
      if (this.phase !== 'QUESTION') return;

      this.timeRemainingSec = Math.max(0, this.timeRemainingSec - 1);
      if (this.timeRemainingSec <= 0) {
        this.revealAnswer();
      } else {
        this.broadcastState();
      }
    }, 1000);
  }

  public pauseMatch(): void {
    if (this.phase === 'QUESTION') {
      this.phase = 'PAUSED';
      this.broadcastState();
    } else if (this.phase === 'PAUSED') {
      this.phase = 'QUESTION';
      this.broadcastState();
    }
  }

  public revealAnswer(): void {
    if (!this.currentQuestion || (this.phase !== 'QUESTION' && this.phase !== 'PAUSED')) {
      return;
    }

    this.clearTimers();
    this.phase = 'REVEAL';
    this.timeRemainingSec = 0;

    const config = this.storage.getConfig();
    const correctOpt = this.currentQuestion.correctOption;
    const basePoints =
      config.pointsByDifficulty[this.currentQuestion.difficulty] || 100;
    const participantsMap = this.storage.getParticipantsMap();

    // Sort all answers by timestamp ascending to find the fastest correct responder
    const allEntries = Array.from(this.roundAnswers.values()).sort(
      (a, b) => a.timestampMs - b.timestampMs
    );

    const winners: RoundAnswerEntry[] = [];
    let firstCorrectAssigned = false;

    for (const entry of allEntries) {
      const participant = this.getOrCreateParticipant(
        participantsMap,
        entry.uniqueId,
        entry.nickname,
        entry.avatarUrl
      );

      participant.totalAnswered += 1;
      const isCorrect = entry.option === correctOpt;
      entry.isCorrect = isCorrect;

      if (isCorrect) {
        participant.correctCount += 1;
        participant.currentStreak += 1;
        if (participant.currentStreak > participant.bestStreak) {
          participant.bestStreak = participant.currentStreak;
        }

        // Speed ratio between 0.1 and 1.0 based on response time
        const maxMs = this.roundDurationSec * 1000;
        const speedRatio = Math.max(
          0,
          Math.min(1, 1 - entry.responseTimeMs / Math.max(1000, maxMs))
        );
        const speedBonus = Math.round(speedRatio * config.speedBonusMax);

        // First correct responder bonus
        let firstBonus = 0;
        if (!firstCorrectAssigned) {
          firstCorrectAssigned = true;
          entry.isFirstCorrect = true;
          firstBonus = config.firstAnswerBonus;
        }

        // Streak bonus
        let streakBonus = 0;
        if (participant.currentStreak >= config.streakBonusThreshold) {
          const streakLevels =
            participant.currentStreak - config.streakBonusThreshold + 1;
          streakBonus = streakLevels * config.streakBonusPerLevel;
        }

        const rawPoints = basePoints + speedBonus + firstBonus + streakBonus;
        const finalPoints = this.doublePointsActive ? rawPoints * 2 : rawPoints;

        participant.score += finalPoints;
        entry.pointsEarned = finalPoints;
        entry.streakAfter = participant.currentStreak;

        participant.lastAnswer = {
          option: entry.option,
          isCorrect: true,
          pointsEarned: finalPoints,
          responseTimeMs: entry.responseTimeMs,
          questionId: this.currentQuestion.id,
        };

        winners.push(entry);
      } else {
        // Incorrect answer — check streak shield
        if (participant.hasStreakShield && participant.currentStreak > 0) {
          participant.hasStreakShield = false;
        } else {
          participant.currentStreak = 0;
        }
        entry.pointsEarned = 0;
        entry.streakAfter = participant.currentStreak;

        participant.lastAnswer = {
          option: entry.option,
          isCorrect: false,
          pointsEarned: 0,
          responseTimeMs: entry.responseTimeMs,
          questionId: this.currentQuestion.id,
        };
      }
    }

    this.storage.saveParticipantsMap(participantsMap);
    this.roundWinners = winners.sort(
      (a, b) => (b.pointsEarned || 0) - (a.pointsEarned || 0)
    );
    this.fastestWinner = winners.find((w) => w.isFirstCorrect) || null;

    this.pushLog({
      type: 'system',
      source: this.tiktokStatus.mode,
      uniqueId: 'system',
      nickname: 'RESULTADO',
      message: `Respuesta correcta: ${correctOpt} (${this.currentQuestion.options[correctOpt]}) — ${winners.length} acertaron.`,
      highlight: true,
    });

    this.broadcastState();

    if (config.autoAdvance) {
      this.revealTimeout = setTimeout(() => {
        if (this.phase === 'REVEAL') {
          this.nextQuestion();
        }
      }, config.revealDurationSec * 1000);
    }
  }

  public endMatch(): void {
    this.clearTimers();
    this.phase = 'ENDED';
    this.broadcastState();
  }

  public returnToLobby(): void {
    this.clearTimers();
    this.phase = 'LOBBY';
    this.currentQuestion = null;
    this.roundAnswers.clear();
    this.roundWinners = [];
    this.fastestWinner = null;
    this.eliminatedOptions = [];
    this.broadcastState();
  }

  public parseAnswerOption(comment: string): OptionKey | null {
    const clean = comment.trim().toUpperCase();
    if (!clean) return null;

    // 1. Single letter or repeated same letter (e.g. "A", "B!", "CCC", "D 🔥", "!A", "B)")
    const singleOrRepeated = clean.match(
      /^[!#/[\s]*([ABCD])\1*[\]).!?\s\p{Emoji_Presentation}\p{Extended_Pictographic}]*$/iu
    );
    if (singleOrRepeated) {
      return singleOrRepeated[1].toUpperCase() as OptionKey;
    }

    // 2. Prefixed like "LA A", "ES LA B", "OPCION C", "LETRA D", "RESPUESTA A", "VOTO B"
    const prefixMatch = clean.match(
      /^(?:LA\s+|ES\s+LA\s+|ES\s+|OPCION\s+|OPCIÓN\s+|LETRA\s+|RESPUESTA\s+|VOTO\s+)([ABCD])(?:\b|[^A-Z])/i
    );
    if (prefixMatch) {
      return prefixMatch[1].toUpperCase() as OptionKey;
    }

    // 3. Letter followed by separator like "B - Luigi" or "A: Wario"
    const leadingOption = clean.match(/^([ABCD])\s*[-:.)]\s+/i);
    if (leadingOption) {
      return leadingOption[1].toUpperCase() as OptionKey;
    }

    // 4. Match exact option text if a question is active
    if (this.currentQuestion) {
      for (const key of ['A', 'B', 'C', 'D'] as OptionKey[]) {
        const optText = this.currentQuestion.options[key].trim().toUpperCase();
        if (optText && clean === optText) {
          return key;
        }
      }
    }

    return null;
  }

  public handleComment(event: IncomingCommentEvent): void {
    const parsedOption = this.parseAnswerOption(event.comment);

    if (
      this.phase === 'QUESTION' &&
      this.currentQuestion &&
      parsedOption &&
      !this.eliminatedOptions.includes(parsedOption)
    ) {
      // Only register the FIRST answer from each viewer per round so they can't spam all 4 letters
      if (!this.roundAnswers.has(event.uniqueId)) {
        const now = Date.now();
        const responseTimeMs = Math.max(100, now - this.questionStartedAtMs);
        const entry: RoundAnswerEntry = {
          uniqueId: event.uniqueId,
          nickname: event.nickname,
          avatarUrl: event.avatarUrl,
          option: parsedOption,
          timestampMs: now,
          responseTimeMs,
        };
        this.roundAnswers.set(event.uniqueId, entry);

        // Ensure participant exists in ranking list
        const participantsMap = this.storage.getParticipantsMap();
        this.getOrCreateParticipant(
          participantsMap,
          event.uniqueId,
          event.nickname,
          event.avatarUrl
        );
        this.storage.saveParticipantsMap(participantsMap);

        this.pushLog({
          type: 'answer',
          source: event.source,
          uniqueId: event.uniqueId,
          nickname: event.nickname,
          message: `Respondió opción ${parsedOption} (${(
            responseTimeMs / 1000
          ).toFixed(1)}s)`,
        });

        this.broadcastState();
        return;
      }
    }

    this.pushLog({
      type: 'comment',
      source: event.source,
      uniqueId: event.uniqueId,
      nickname: event.nickname,
      message: event.comment,
    });
  }

  public handleLike(event: IncomingLikeEvent): void {
    const config = this.storage.getConfig();
    const participantsMap = this.storage.getParticipantsMap();
    const participant = this.getOrCreateParticipant(
      participantsMap,
      event.uniqueId,
      event.nickname,
      event.avatarUrl
    );
    participant.likesSent += event.likeCount;
    this.storage.saveParticipantsMap(participantsMap);

    let { totalLikes, likeGoalsCompleted } = this.storage.getLikesData();
    totalLikes += event.likeCount;

    const target = Math.max(50, config.likeGoalTarget);
    const newGoalsCompleted = Math.floor(totalLikes / target);

    if (newGoalsCompleted > likeGoalsCompleted) {
      likeGoalsCompleted = newGoalsCompleted;
      if (config.likeGoalRewardType === 'double_points_round') {
        if (this.phase === 'QUESTION') {
          this.doublePointsActive = true;
        } else {
          this.nextRoundDoublePoints = true;
        }
        this.showBanner({
          type: 'like_goal',
          title: '¡META DE LIKES ALCANZADA!',
          subtitle: '¡PUNTOS DOBLES (x2) ACTIVADOS PARA TODOS!',
          triggeredBy: `${event.nickname} y el chat`,
          icon: '❤️‍🔥',
        });
      } else {
        if (this.phase === 'QUESTION') {
          this.timeRemainingSec += 8;
          this.roundDurationSec += 8;
        } else {
          this.nextRoundExtraTimeSec += 8;
        }
        this.showBanner({
          type: 'like_goal',
          title: '¡META DE LIKES ALCANZADA!',
          subtitle: '¡+8 SEGUNDOS EXTRA DE TIEMPO PARA EL CHAT!',
          triggeredBy: `${event.nickname} y el chat`,
          icon: '⚡',
        });
      }
    }

    this.storage.saveLikesData(totalLikes, likeGoalsCompleted);
    this.broadcastState();
  }

  public handleGift(event: IncomingGiftEvent): void {
    const participantsMap = this.storage.getParticipantsMap();
    const participant = this.getOrCreateParticipant(
      participantsMap,
      event.uniqueId,
      event.nickname,
      event.avatarUrl
    );

    participant.giftsSent += event.repeatCount;
    participant.coinsGiven += event.diamondCount;

    const gifts = this.storage.getGifts().filter((g) => g.enabled);
    const matchedGift =
      gifts.find(
        (g) =>
          g.giftName.toLowerCase() === event.giftName.toLowerCase() ||
          (g.giftId && g.giftId === event.giftId)
      ) ||
      gifts
        .slice()
        .sort((a, b) => b.coins - a.coins)
        .find((g) => event.diamondCount >= g.coins);

    if (matchedGift) {
      this.applyGiftEffect(participant, matchedGift.effectType, matchedGift.effectValue, matchedGift.giftName, matchedGift.icon);
    } else {
      // Fallback bonus points proportional to coins
      const bonus = Math.max(15, event.diamondCount * 5);
      participant.score += bonus;
      this.showBanner({
        type: 'bonus_points',
        title: `¡REGALO DE ${event.nickname.toUpperCase()}!`,
        subtitle: `Envió ${event.giftName} (+${bonus} PTS DE BONO)`,
        triggeredBy: event.nickname,
        icon: '🎁',
      });
    }

    this.storage.saveParticipantsMap(participantsMap);

    this.pushLog({
      type: 'gift',
      source: event.source,
      uniqueId: event.uniqueId,
      nickname: event.nickname,
      message: `Envió ${event.repeatCount}x ${event.giftName} (${event.diamondCount} monedas)`,
      highlight: true,
    });

    this.broadcastState();
  }

  private applyGiftEffect(
    participant: Participant,
    effectType: string,
    effectValue: number,
    giftName: string,
    icon: string
  ): void {
    switch (effectType) {
      case 'double_points': {
        participant.score += 400;
        if (this.phase === 'QUESTION') {
          this.doublePointsActive = true;
        } else {
          this.nextRoundDoublePoints = true;
        }
        this.showBanner({
          type: 'double_points',
          title: '¡RONDA DE PUNTOS DOBLES X2!',
          subtitle: `${participant.nickname} activó X2 global con ${giftName} (+400 pts)`,
          triggeredBy: participant.nickname,
          icon: icon || '🌌',
        });
        break;
      }
      case 'extra_time': {
        const extraSec = Math.max(3, effectValue || 5);
        participant.score += 50;
        if (this.phase === 'QUESTION') {
          this.timeRemainingSec += extraSec;
          this.roundDurationSec += extraSec;
        } else {
          this.nextRoundExtraTimeSec += extraSec;
        }
        this.showBanner({
          type: 'extra_time',
          title: `¡+${extraSec} SEGUNDOS EXTRA!`,
          subtitle: `${participant.nickname} envió ${giftName} y dio más tiempo (+50 pts)`,
          triggeredBy: participant.nickname,
          icon: icon || '⏱️',
        });
        break;
      }
      case 'fifty_fifty': {
        participant.score += 100;
        if (this.phase === 'QUESTION' && this.currentQuestion) {
          const allOpts: OptionKey[] = ['A', 'B', 'C', 'D'];
          const wrongRemaining = allOpts.filter(
            (o) =>
              o !== this.currentQuestion!.correctOption &&
              !this.eliminatedOptions.includes(o)
          );
          if (wrongRemaining.length > 1) {
            const toEliminate =
              wrongRemaining[Math.floor(Math.random() * wrongRemaining.length)];
            this.eliminatedOptions.push(toEliminate);
          }
        }
        this.showBanner({
          type: 'fifty_fifty',
          title: '¡PISTA 50/50 ACTIVADA!',
          subtitle: `${participant.nickname} eliminó una opción incorrecta con ${giftName}`,
          triggeredBy: participant.nickname,
          icon: icon || '🍩',
        });
        break;
      }
      case 'streak_shield': {
        const bonus = Math.max(50, effectValue || 150);
        participant.hasStreakShield = true;
        participant.score += bonus;
        this.showBanner({
          type: 'streak_shield',
          title: '¡ESCUDO DE RACHA ACTIVADO!',
          subtitle: `${participant.nickname} protegió su racha y ganó +${bonus} pts`,
          triggeredBy: participant.nickname,
          icon: icon || '🛡️',
        });
        break;
      }
      case 'bonus_points':
      default: {
        const pts = Math.max(10, effectValue || 25);
        participant.score += pts;
        this.showBanner({
          type: 'bonus_points',
          title: `¡BONO GAMER +${pts} PTS!`,
          subtitle: `${participant.nickname} envió ${giftName}`,
          triggeredBy: participant.nickname,
          icon: icon || '🌹',
        });
        break;
      }
    }
  }

  private getOrCreateParticipant(
    map: Record<string, Participant>,
    uniqueId: string,
    nickname: string,
    avatarUrl?: string
  ): Participant {
    const key = uniqueId.toLowerCase();
    if (!map[key]) {
      map[key] = {
        uniqueId,
        nickname: nickname || uniqueId,
        avatarUrl,
        score: 0,
        correctCount: 0,
        totalAnswered: 0,
        currentStreak: 0,
        bestStreak: 0,
        likesSent: 0,
        giftsSent: 0,
        coinsGiven: 0,
        hasStreakShield: false,
      };
    } else {
      if (nickname) map[key].nickname = nickname;
      if (avatarUrl) map[key].avatarUrl = avatarUrl;
    }
    return map[key];
  }

  public adjustParticipantScore(uniqueId: string, delta: number): void {
    const map = this.storage.getParticipantsMap();
    const key = uniqueId.toLowerCase();
    if (map[key]) {
      map[key].score = Math.max(0, map[key].score + delta);
      this.storage.saveParticipantsMap(map);
      this.broadcastState();
    }
  }

  public removeParticipant(uniqueId: string): void {
    const map = this.storage.getParticipantsMap();
    const key = uniqueId.toLowerCase();
    if (map[key]) {
      delete map[key];
      this.storage.saveParticipantsMap(map);
      this.broadcastState();
    }
  }

  public resetLeaderboard(): void {
    this.storage.resetRankingAndStats();
    this.broadcastState();
  }

  private clearTimers(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.revealTimeout) {
      clearTimeout(this.revealTimeout);
      this.revealTimeout = null;
    }
  }

  public getLiveState(): LiveGameState {
    const config = this.storage.getConfig();
    const categories = this.storage.getCategories();
    const participantsMap = this.storage.getParticipantsMap();
    const { totalLikes, likeGoalsCompleted } = this.storage.getLikesData();

    const currentCategory: Category | null = this.currentQuestion
      ? categories.find((c) => c.id === this.currentQuestion!.categoryId) || null
      : null;

    const optionDistribution: Record<OptionKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };

    const allRoundEntries = Array.from(this.roundAnswers.values());
    for (const entry of allRoundEntries) {
      optionDistribution[entry.option] += 1;
    }

    const recentAnswersFeed = allRoundEntries
      .slice(-8)
      .reverse()
      .map((e) => ({
        uniqueId: e.uniqueId,
        nickname: e.nickname,
        option: e.option,
        responseTimeMs: e.responseTimeMs,
      }));

    const sortedLeaderboard = Object.values(participantsMap).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return b.bestStreak - a.bestStreak;
    });

    const target = Math.max(50, config.likeGoalTarget);
    const likeGoalProgress = totalLikes % target;

    return {
      phase: this.phase,
      roundNumber: this.roundNumber,
      totalRoundsPlayed: this.totalRoundsPlayed,
      currentQuestion: this.currentQuestion,
      currentCategory,
      timeRemainingSec: this.timeRemainingSec,
      roundDurationSec: this.roundDurationSec,
      eliminatedOptions: this.eliminatedOptions,
      doublePointsActive: this.doublePointsActive,
      roundAnswersCount: allRoundEntries.length,
      optionDistribution,
      recentAnswersFeed,
      roundWinners: this.roundWinners,
      fastestWinner: this.fastestWinner,
      activeBanner: this.activeBanner,
      totalLikes,
      likeGoalProgress,
      likeGoalTarget: target,
      likeGoalsCompleted,
      leaderboard: sortedLeaderboard.slice(0, 50),
      totalParticipants: sortedLeaderboard.length,
      tiktokStatus: this.tiktokStatus,
      config,
    };
  }

  public broadcastState(): void {
    this.emit('state_update', this.getLiveState());
  }
}

