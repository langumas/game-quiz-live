import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Trophy,
  Zap,
  Heart,
  Clock,
  Shield,
  Sparkles,
  Gamepad2,
  Crown,
  CheckCircle2,
  XCircle,
  PauseCircle,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Difficulty, OptionKey } from '../../shared/types';
import { soundFX } from '../utils/sound';

interface OverlayViewProps {
  embedded?: boolean;
}

const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; colorClass: string; badgeBg: string }
> = {
  facil: {
    label: 'NIVEL FÁCIL',
    colorClass: 'text-emerald-400 border-emerald-500/50',
    badgeBg: 'bg-emerald-500/15',
  },
  medio: {
    label: 'NIVEL MEDIO',
    colorClass: 'text-cyan-400 border-cyan-500/50',
    badgeBg: 'bg-cyan-500/15',
  },
  dificil: {
    label: 'NIVEL DIFÍCIL',
    colorClass: 'text-amber-400 border-amber-500/50',
    badgeBg: 'bg-amber-500/15',
  },
  experto: {
    label: 'NIVEL EXPERTO',
    colorClass: 'text-rose-400 border-rose-500/50',
    badgeBg: 'bg-rose-500/15',
  },
};

const OPTION_STYLES: Record<
  OptionKey,
  {
    badgeBg: string;
    borderIdle: string;
    glowClass: string;
    barColor: string;
    textAccent: string;
  }
> = {
  A: {
    badgeBg: 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.7)]',
    borderIdle: 'border-cyan-500/40 hover:border-cyan-400',
    glowClass: 'shadow-[0_0_25px_rgba(0,240,255,0.12)]',
    barColor: 'bg-cyan-400',
    textAccent: 'text-cyan-300',
  },
  B: {
    badgeBg: 'bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.7)]',
    borderIdle: 'border-fuchsia-500/40 hover:border-fuchsia-400',
    glowClass: 'shadow-[0_0_25px_rgba(217,70,239,0.12)]',
    barColor: 'bg-fuchsia-400',
    textAccent: 'text-fuchsia-300',
  },
  C: {
    badgeBg: 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.7)]',
    borderIdle: 'border-amber-400/40 hover:border-amber-300',
    glowClass: 'shadow-[0_0_25px_rgba(251,191,36,0.12)]',
    barColor: 'bg-amber-400',
    textAccent: 'text-amber-300',
  },
  D: {
    badgeBg: 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.7)]',
    borderIdle: 'border-violet-500/40 hover:border-violet-400',
    glowClass: 'shadow-[0_0_25px_rgba(139,92,246,0.12)]',
    barColor: 'bg-violet-400',
    textAccent: 'text-violet-300',
  },
};

export const OverlayView: React.FC<OverlayViewProps> = ({ embedded = false }) => {
  const { state, gifts } = useGame();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const prevPhaseRef = useRef<string>('');
  const prevQuestionIdRef = useRef<string>('');
  const prevBannerIdRef = useRef<string>('');
  const prevTimeRef = useRef<number>(0);

  // Compute responsive scale to always keep exact 1080x1920 (9:16) proportions
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 1080 && clientHeight === 1920) {
        setScale(1);
        return;
      }
      const scaleX = clientWidth / 1080;
      const scaleY = clientHeight / 1920;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  // Sound & Confetti effects on state transitions
  useEffect(() => {
    if (!state) return;
    const soundAllowed = state.config.soundEnabled && !embedded;

    // New question started
    if (
      state.phase === 'QUESTION' &&
      state.currentQuestion &&
      state.currentQuestion.id !== prevQuestionIdRef.current
    ) {
      prevQuestionIdRef.current = state.currentQuestion.id;
      if (soundAllowed) soundFX.playNewQuestion();
    }

    // Countdown tick sound
    if (
      state.phase === 'QUESTION' &&
      state.timeRemainingSec !== prevTimeRef.current &&
      state.timeRemainingSec > 0
    ) {
      prevTimeRef.current = state.timeRemainingSec;
      if (soundAllowed && state.timeRemainingSec <= 10) {
        soundFX.playTick(state.timeRemainingSec <= 5);
      }
    }

    // Reveal or End Match transitions
    if (state.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = state.phase;
      if (state.phase === 'REVEAL') {
        if (soundAllowed) soundFX.playReveal();
        if (!embedded && state.roundWinners.length > 0) {
          confetti({
            particleCount: 55,
            spread: 65,
            origin: { y: 0.45 },
          });
        }
      } else if (state.phase === 'ENDED') {
        if (soundAllowed) soundFX.playPowerUp();
        if (!embedded) {
          confetti({
            particleCount: 110,
            spread: 90,
            origin: { y: 0.35 },
          });
        }
      }
    }

    // Gift or Like Goal banner pop
    if (
      state.activeBanner &&
      state.activeBanner.id !== prevBannerIdRef.current
    ) {
      prevBannerIdRef.current = state.activeBanner.id;
      if (soundAllowed) soundFX.playPowerUp();
    }
  }, [state, embedded]);

  if (!state) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#060814] text-cyan-400 font-display text-2xl">
        CONECTANDO GAME QUIZ LIVE...
      </div>
    );
  }

  const {
    phase,
    roundNumber,
    currentQuestion,
    currentCategory,
    timeRemainingSec,
    roundDurationSec,
    eliminatedOptions,
    doublePointsActive,
    roundAnswersCount,
    optionDistribution,
    recentAnswersFeed,
    roundWinners,
    fastestWinner,
    activeBanner,
    totalLikes,
    likeGoalProgress,
    likeGoalTarget,
    leaderboard,
    config,
  } = state;

  const isTransparent = config.transparentOverlay;
  const timerPercent =
    roundDurationSec > 0
      ? Math.max(0, Math.min(100, (timeRemainingSec / roundDurationSec) * 100))
      : 0;
  const isUrgent = phase === 'QUESTION' && timeRemainingSec <= 5;
  const likePercent = Math.min(
    100,
    Math.round((likeGoalProgress / Math.max(1, likeGoalTarget)) * 100)
  );
  const enabledGifts = gifts.filter((g) => g.enabled).slice(0, 5);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center overflow-hidden select-none ${
        isTransparent ? 'bg-transparent' : 'bg-[#04060e]'
      }`}
    >
      {/* 1080 x 1920 Native 9:16 Vertical Stage */}
      <div
        style={{
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className={`relative flex flex-col justify-between p-9 overflow-hidden ${
          isTransparent
            ? 'bg-transparent'
            : 'cyber-grid-bg border-[3px] border-cyan-500/30 shadow-[0_0_80px_rgba(0,240,255,0.18)]'
        }`}
      >
        {/* Ambient corner neon accents */}
        {!isTransparent && (
          <>
            <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/15 blur-[110px]" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-fuchsia-600/15 blur-[110px]" />
          </>
        )}

        {/* ==================== TOP BAR: BRANDING + LIKE GOAL ==================== */}
        <header className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center justify-between bg-slate-950/85 backdrop-blur-xl border-2 border-cyan-500/40 rounded-3xl px-7 py-5 neon-box-cyan">
            {/* Show Logo & Live Badge */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.6)]">
                <Gamepad2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 font-display text-xs font-bold tracking-widest uppercase">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    EN VIVO
                  </span>
                  {roundNumber > 0 && (
                    <span className="text-cyan-300 font-mono text-base font-bold tracking-wider">
                      RONDA #{roundNumber}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-black text-3xl tracking-wider text-white neon-text-cyan">
                  GAME QUIZ <span className="text-cyan-400">LIVE</span>
                </h1>
              </div>
            </div>

            {/* Category & Difficulty / Double Points Pill */}
            <div className="flex items-center gap-3">
              {doublePointsActive && (
                <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-pink-600 text-white font-display font-black text-lg tracking-wider animate-bounce shadow-[0_0_25px_rgba(245,158,11,0.75)] flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  PUNTOS X2
                </div>
              )}

              {currentCategory && (
                <div
                  className="px-5 py-2.5 rounded-2xl bg-slate-900/90 border-2 flex items-center gap-2.5"
                  style={{ borderColor: currentCategory.color }}
                >
                  <span className="text-2xl">{currentCategory.icon}</span>
                  <span className="font-gaming font-bold text-xl text-white uppercase tracking-wide">
                    {currentCategory.name}
                  </span>
                </div>
              )}

              {currentQuestion && (
                <div
                  className={`px-5 py-2.5 rounded-2xl border-2 font-display font-bold text-base tracking-wider ${
                    DIFFICULTY_META[currentQuestion.difficulty].colorClass
                  } ${DIFFICULTY_META[currentQuestion.difficulty].badgeBg}`}
                >
                  {DIFFICULTY_META[currentQuestion.difficulty].label} (
                  +{config.pointsByDifficulty[currentQuestion.difficulty]})
                </div>
              )}
            </div>
          </div>

          {/* Like Goal Progress Bar */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-pink-500/40 rounded-2xl px-6 py-3.5 flex items-center gap-5">
            <div className="flex items-center gap-2.5 text-pink-400 font-display font-bold text-lg shrink-0">
              <Heart className="w-6 h-6 fill-pink-500 text-pink-500 animate-pulse" />
              <span>META DE LIKES</span>
            </div>
            <div className="flex-1 h-5 bg-slate-900 rounded-full overflow-hidden border border-pink-500/30 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 transition-all duration-500 shadow-[0_0_15px_rgba(236,72,153,0.8)]"
                style={{ width: `${likePercent}%` }}
              />
            </div>
            <div className="font-mono font-bold text-lg text-white shrink-0">
              <span className="text-pink-400">{likeGoalProgress}</span> /{' '}
              {likeGoalTarget}{' '}
              <span className="text-xs text-cyan-300 uppercase ml-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/30">
                {config.likeGoalRewardType === 'double_points_round'
                  ? '🎁 Premio: Ronda X2'
                  : '🎁 Premio: +8s Extra'}
              </span>
            </div>
          </div>
        </header>

        {/* ==================== SPECIAL GIFT / GOAL BANNER POPUP ==================== */}
        {activeBanner && (
          <div className="relative z-30 my-2 animate-pop-in">
            <div className="bg-gradient-to-r from-fuchsia-600/95 via-purple-600/95 to-cyan-600/95 border-2 border-white/60 rounded-3xl px-8 py-5 shadow-[0_0_50px_rgba(217,70,239,0.8)] flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-4xl">
                  {activeBanner.icon}
                </div>
                <div>
                  <div className="font-display font-black text-2xl text-white tracking-wider">
                    {activeBanner.title}
                  </div>
                  <div className="font-sans font-semibold text-lg text-cyan-100">
                    {activeBanner.subtitle}
                  </div>
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-slate-950/50 border border-white/30 font-mono text-sm text-amber-300 font-bold">
                🔥 {activeBanner.triggeredBy}
              </div>
            </div>
          </div>
        )}

        {/* ==================== MAIN STAGE AREA ==================== */}
        <main className="relative z-10 flex-1 flex flex-col justify-center my-4">
          {/* 1. LOBBY PHASE */}
          {phase === 'LOBBY' && (
            <div className="bg-slate-950/85 backdrop-blur-xl border-2 border-cyan-500/40 rounded-[36px] p-10 text-center neon-box-cyan flex flex-col items-center gap-7">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 flex items-center justify-center shadow-[0_0_45px_rgba(0,240,255,0.6)] animate-float">
                <Trophy className="w-16 h-16 text-white" />
              </div>

              <div className="space-y-3">
                <span className="px-5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-display font-bold text-base tracking-widest uppercase">
                  CONCURSO INTERACTIVO EN VIVO
                </span>
                <h2 className="font-display font-black text-5xl text-white leading-tight">
                  ¡DEMUESTRA CUÁNTO SABES DE{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                    VIDEOJUEGOS!
                  </span>
                </h2>
                <p className="text-slate-300 text-2xl max-w-2xl mx-auto font-medium">
                  Responde en el chat escribiendo la letra{' '}
                  <span className="text-cyan-400 font-bold">A</span>,{' '}
                  <span className="text-fuchsia-400 font-bold">B</span>,{' '}
                  <span className="text-amber-400 font-bold">C</span> o{' '}
                  <span className="text-violet-400 font-bold">D</span> antes de que
                  termine el reloj.
                </p>
              </div>

              {/* How to score cards */}
              <div className="grid grid-cols-3 gap-5 w-full">
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 flex flex-col items-center gap-2">
                  <Zap className="w-10 h-10 text-cyan-400" />
                  <div className="font-display font-bold text-xl text-white">
                    BONO VELOCIDAD
                  </div>
                  <p className="text-slate-400 text-base">
                    Hasta +{config.speedBonusMax} pts extra por responder rápido y +
                    {config.firstAnswerBonus} pts al 1º en acertar.
                  </p>
                </div>
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 flex flex-col items-center gap-2">
                  <Flame className="w-10 h-10 text-amber-400" />
                  <div className="font-display font-bold text-xl text-white">
                    RACHA EN LLAMAS
                  </div>
                  <p className="text-slate-400 text-base">
                    Acierta {config.streakBonusThreshold}+ seguidas para ganar +
                    {config.streakBonusPerLevel} pts extra por nivel.
                  </p>
                </div>
                <div className="bg-slate-900/90 border border-fuchsia-500/30 rounded-2xl p-5 flex flex-col items-center gap-2">
                  <Sparkles className="w-10 h-10 text-fuchsia-400" />
                  <div className="font-display font-bold text-xl text-white">
                    PODERES EN VIVO
                  </div>
                  <p className="text-slate-400 text-base">
                    Los Likes y Regalos activan Pistas 50/50, Tiempo Extra y Rondas X2.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. QUESTION / PAUSED / REVEAL PHASE */}
          {(phase === 'QUESTION' || phase === 'PAUSED' || phase === 'REVEAL') &&
            currentQuestion && (
              <div className="flex flex-col gap-6">
                {/* Timer & Live Response Counter Bar */}
                <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-slate-800 rounded-3xl p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-black text-3xl border-2 ${
                          phase === 'REVEAL'
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : isUrgent
                            ? 'bg-rose-500/25 border-rose-500 text-rose-400 animate-ping'
                            : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        }`}
                      >
                        {phase === 'REVEAL' ? '✓' : timeRemainingSec}
                      </div>
                      <div>
                        <div className="font-display font-bold text-xl text-white flex items-center gap-2">
                          {phase === 'PAUSED' ? (
                            <span className="text-amber-400 flex items-center gap-2">
                              <PauseCircle className="w-6 h-6" /> PARTIDA EN PAUSA
                            </span>
                          ) : phase === 'REVEAL' ? (
                            <span className="text-emerald-400">
                              ¡TIEMPO FINALIZADO! RESPUESTA CORRECTA
                            </span>
                          ) : isUrgent ? (
                            <span className="text-rose-400 animate-pulse">
                              ¡ÚLTIMOS SEGUNDOS! ¡RESPONDE YA!
                            </span>
                          ) : (
                            <span>ESCRIBE A, B, C o D EN EL CHAT</span>
                          )}
                        </div>
                        <div className="text-slate-400 text-base font-medium">
                          {roundAnswersCount} respuestas recibidas en esta ronda
                        </div>
                      </div>
                    </div>

                    {/* Fastest Responder or Current Speed Bonus Indicator */}
                    {phase === 'REVEAL' && fastestWinner ? (
                      <div className="px-5 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center gap-3">
                        <Zap className="w-7 h-7 text-amber-400" />
                        <div>
                          <div className="text-xs font-display font-bold text-amber-300 uppercase">
                            MÁS VELOZ DE LA RONDA
                          </div>
                          <div className="text-lg font-bold text-white">
                            {fastestWinner.nickname}{' '}
                            <span className="text-amber-400 font-mono text-base">
                              ({(fastestWinner.responseTimeMs / 1000).toFixed(1)}s)
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-cyan-500/30 flex items-center gap-2.5 font-mono text-lg text-cyan-300 font-bold">
                        <Clock className="w-6 h-6 text-cyan-400" />
                        <span>{timeRemainingSec}s</span>
                      </div>
                    )}
                  </div>

                  {/* Animated Timer Progress Bar */}
                  <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        phase === 'REVEAL'
                          ? 'bg-emerald-400 w-full'
                          : isUrgent
                          ? 'bg-gradient-to-r from-rose-600 to-amber-500 shadow-[0_0_20px_rgba(244,63,94,0.9)]'
                          : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 shadow-[0_0_15px_rgba(0,240,255,0.7)]'
                      }`}
                      style={{
                        width: phase === 'REVEAL' ? '100%' : `${timerPercent}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Question Card */}
                <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-cyan-400/50 rounded-[32px] p-8 neon-box-cyan relative overflow-hidden">
                  <div className="text-cyan-400 font-display font-bold text-sm tracking-widest uppercase mb-2 flex items-center justify-between">
                    <span>PREGUNTA EN PANTALLA</span>
                    <span>
                      VALOR BASE: +{config.pointsByDifficulty[currentQuestion.difficulty]}{' '}
                      PTS {doublePointsActive ? '(X2 ACTIVO)' : ''}
                    </span>
                  </div>
                  <h2 className="font-sans font-extrabold text-4xl text-white leading-snug tracking-tight">
                    {currentQuestion.text}
                  </h2>
                </div>

                {/* 4 Options Grid (A, B, C, D) */}
                <div className="grid grid-cols-1 gap-4">
                  {(['A', 'B', 'C', 'D'] as OptionKey[]).map((optKey) => {
                    const style = OPTION_STYLES[optKey];
                    const isEliminated = eliminatedOptions.includes(optKey);
                    const isCorrect =
                      phase === 'REVEAL' &&
                      currentQuestion.correctOption === optKey;
                    const isWrongReveal =
                      phase === 'REVEAL' &&
                      currentQuestion.correctOption !== optKey;

                    const votes = optionDistribution[optKey] || 0;
                    const votePct =
                      roundAnswersCount > 0
                        ? Math.round((votes / roundAnswersCount) * 100)
                        : 0;

                    return (
                      <div
                        key={optKey}
                        className={`relative overflow-hidden rounded-3xl border-2 px-6 py-5 transition-all duration-300 flex items-center justify-between ${
                          isEliminated
                            ? 'bg-slate-950/40 border-slate-800 opacity-35 grayscale'
                            : isCorrect
                            ? 'bg-emerald-950/90 border-emerald-400 neon-box-lime scale-[1.02]'
                            : isWrongReveal
                            ? 'bg-slate-950/60 border-slate-800/80 opacity-55'
                            : `bg-slate-950/88 ${style.borderIdle} ${style.glowClass}`
                        }`}
                      >
                        {/* Vote percentage background bar during REVEAL */}
                        {phase === 'REVEAL' && (
                          <div
                            className={`absolute left-0 top-0 bottom-0 transition-all duration-700 opacity-20 ${
                              isCorrect ? 'bg-emerald-400' : style.barColor
                            }`}
                            style={{ width: `${votePct}%` }}
                          />
                        )}

                        <div className="relative z-10 flex items-center gap-5">
                          <div
                            className={`w-16 h-16 rounded-2xl font-display font-black text-3xl flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-400 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.9)]'
                                : style.badgeBg
                            }`}
                          >
                            {optKey}
                          </div>
                          <div>
                            <div
                              className={`font-sans font-bold text-3xl leading-tight ${
                                isEliminated
                                  ? 'line-through text-slate-500'
                                  : 'text-white'
                              }`}
                            >
                              {currentQuestion.options[optKey]}
                            </div>
                            {isEliminated && (
                              <span className="text-rose-400 font-display text-xs font-bold uppercase tracking-wider">
                                ❌ OPCIÓN DESCARTADA POR COMODÍN 50/50
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side status / votes */}
                        <div className="relative z-10 flex items-center gap-3 shrink-0">
                          {phase === 'REVEAL' && (
                            <div className="text-right mr-2">
                              <div className="font-mono font-bold text-2xl text-white">
                                {votePct}%
                              </div>
                              <div className="text-xs text-slate-400 font-medium">
                                {votes} votos
                              </div>
                            </div>
                          )}
                          {isCorrect && (
                            <CheckCircle2 className="w-11 h-11 text-emerald-400 shrink-0" />
                          )}
                          {isWrongReveal && (
                            <XCircle className="w-9 h-9 text-slate-600 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Activity Strip: Either Recent Answers Ticker (QUESTION) or Round Winners & Explanation (REVEAL) */}
                {phase === 'REVEAL' ? (
                  <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-emerald-500/40 rounded-3xl p-5 flex flex-col gap-3">
                    {currentQuestion.explanation && (
                      <div className="text-emerald-200 text-lg font-medium bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-2.5">
                        💡 <span className="font-bold">Dato Gamer:</span>{' '}
                        {currentQuestion.explanation}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-emerald-400 uppercase tracking-wider">
                        🏆 GANADORES DE LA RONDA ({roundWinners.length})
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Velocidad + Racha incluidos
                      </span>
                    </div>

                    {roundWinners.length === 0 ? (
                      <div className="text-slate-400 text-lg font-medium py-1">
                        ¡Nadie acertó esta pregunta! Preparando la siguiente ronda...
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {roundWinners.slice(0, 6).map((w) => (
                          <div
                            key={w.uniqueId}
                            className="px-4 py-2 rounded-2xl bg-slate-900 border border-emerald-500/40 flex items-center gap-2.5 animate-slide-up"
                          >
                            {w.isFirstCorrect && (
                              <span className="text-amber-400 text-lg" title="Más rápido">
                                ⚡
                              </span>
                            )}
                            <span className="font-bold text-lg text-white">
                              {w.nickname}
                            </span>
                            <span className="font-mono font-bold text-base text-emerald-400">
                              +{w.pointsEarned}
                            </span>
                            {(w.streakAfter || 0) >= 2 && (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center gap-1">
                                🔥 x{w.streakAfter}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl px-5 py-3.5 flex items-center gap-4 min-h-[68px]">
                    <span className="font-display font-bold text-sm text-cyan-400 uppercase tracking-wider shrink-0 flex items-center gap-2">
                      <Zap className="w-5 h-5" /> RESPUESTAS EN VIVO:
                    </span>
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {recentAnswersFeed.length === 0 ? (
                        <span className="text-slate-400 text-base italic">
                          Esperando respuestas en el chat (Escribe A, B, C o D)...
                        </span>
                      ) : (
                        recentAnswersFeed.slice(0, 4).map((item, idx) => (
                          <div
                            key={`${item.uniqueId}-${idx}`}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center gap-2 shrink-0 animate-slide-up"
                          >
                            <span className="font-bold text-base text-white">
                              {item.nickname}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-sm">
                              Marcó {item.option}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              {(item.responseTimeMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* 3. ENDED PHASE: PODIUM OF CHAMPIONS */}
          {phase === 'ENDED' && (
            <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-amber-400/50 rounded-[36px] p-9 text-center neon-box-amber flex flex-col items-center gap-7">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-display font-bold text-base uppercase tracking-widest">
                  <Crown className="w-5 h-5" /> PARTIDA FINALIZADA
                </div>
                <h2 className="font-display font-black text-5xl text-white">
                  PODIO DE CAMPEONES
                </h2>
              </div>

              {/* Top 3 Podium Cards */}
              <div className="grid grid-cols-3 gap-5 w-full items-end pt-4">
                {/* 2nd Place */}
                <div className="bg-slate-900/90 border-2 border-slate-400/50 rounded-3xl p-6 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-400/20 border border-slate-300 flex items-center justify-center font-display font-black text-3xl text-slate-200">
                    #2
                  </div>
                  <div className="font-bold text-2xl text-white truncate max-w-full">
                    {leaderboard[1]?.nickname || '---'}
                  </div>
                  <div className="font-mono font-black text-3xl text-slate-200">
                    {leaderboard[1]?.score ?? 0} PTS
                  </div>
                  <div className="text-sm text-slate-400">
                    {leaderboard[1]?.correctCount ?? 0} aciertos · 🔥{' '}
                    {leaderboard[1]?.bestStreak ?? 0}
                  </div>
                </div>

                {/* 1st Place Champion */}
                <div className="bg-gradient-to-b from-amber-500/25 to-slate-900/95 border-2 border-amber-400 rounded-3xl p-8 flex flex-col items-center gap-3.5 shadow-[0_0_40px_rgba(251,191,36,0.35)] -translate-y-4">
                  <Crown className="w-14 h-14 text-amber-400 animate-bounce" />
                  <div className="px-4 py-1 rounded-full bg-amber-400 text-slate-950 font-display font-black text-sm uppercase">
                    CAMPEÓN #1
                  </div>
                  <div className="font-extrabold text-3xl text-white truncate max-w-full">
                    {leaderboard[0]?.nickname || 'Sin Ganador'}
                  </div>
                  <div className="font-mono font-black text-4xl text-amber-400">
                    {leaderboard[0]?.score ?? 0} PTS
                  </div>
                  <div className="text-base text-amber-200/80 font-medium">
                    {leaderboard[0]?.correctCount ?? 0} aciertos · Mejor racha 🔥{' '}
                    {leaderboard[0]?.bestStreak ?? 0}
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="bg-slate-900/90 border-2 border-amber-700/60 rounded-3xl p-6 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-amber-700/25 border border-amber-600 flex items-center justify-center font-display font-black text-3xl text-amber-500">
                    #3
                  </div>
                  <div className="font-bold text-2xl text-white truncate max-w-full">
                    {leaderboard[2]?.nickname || '---'}
                  </div>
                  <div className="font-mono font-black text-3xl text-amber-500">
                    {leaderboard[2]?.score ?? 0} PTS
                  </div>
                  <div className="text-sm text-slate-400">
                    {leaderboard[2]?.correctCount ?? 0} aciertos · 🔥{' '}
                    {leaderboard[2]?.bestStreak ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ==================== BOTTOM DOCK: LIVE RANKING + GIFT BAR ==================== */}
        <footer className="relative z-10 flex flex-col gap-4">
          {/* Top 5 Live Leaderboard */}
          <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-cyan-500/35 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-7 h-7 text-amber-400" />
                <h3 className="font-display font-black text-2xl text-white tracking-wider">
                  RANKING EN TIEMPO REAL
                </h3>
              </div>
              <div className="font-mono text-base text-cyan-300 font-semibold">
                {state.totalParticipants} Jugadores Activos · ❤️ {totalLikes} Likes
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-5 text-center text-slate-400 text-xl font-medium border border-dashed border-slate-800 rounded-2xl">
                ¡Aún no hay puntos registrados! Sé el primero en acertar en el chat.
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {leaderboard.slice(0, 5).map((player, index) => {
                  const rank = index + 1;
                  const rankColors =
                    rank === 1
                      ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                      : rank === 2
                      ? 'border-slate-300 bg-slate-400/15 text-slate-200'
                      : rank === 3
                      ? 'border-amber-700 bg-amber-800/15 text-amber-400'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300';

                  return (
                    <div
                      key={player.uniqueId}
                      className={`rounded-2xl border-2 p-3.5 flex flex-col justify-between transition-all ${rankColors}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-display font-black text-lg">
                          #{rank}
                        </span>
                        <div className="flex items-center gap-1">
                          {player.hasStreakShield && (
                            <span title="Escudo de Racha Activo">
                              <Shield className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
                            </span>
                          )}
                          {player.currentStreak >= 2 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-mono text-xs font-bold flex items-center gap-0.5">
                              🔥{player.currentStreak}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-bold text-lg text-white truncate">
                        {player.nickname}
                      </div>

                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-mono font-black text-xl text-cyan-300">
                          {player.score}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {player.correctCount}✓
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gift Power-ups Bar */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-fuchsia-500/40 rounded-2xl px-6 py-3.5 flex items-center justify-between">
            <div className="font-display font-bold text-base text-fuchsia-400 uppercase tracking-wider flex items-center gap-2 shrink-0">
              <Sparkles className="w-5 h-5" /> PODERES CON REGALOS:
            </div>
            <div className="flex items-center gap-3 overflow-hidden">
              {enabledGifts.map((gift) => (
                <div
                  key={gift.id}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-fuchsia-500/30 flex items-center gap-2 text-sm"
                >
                  <span className="text-xl">{gift.icon}</span>
                  <span className="font-bold text-white">{gift.giftName}:</span>
                  <span className="text-cyan-300 font-semibold">
                    {gift.effectType === 'double_points' && '¡Ronda X2!'}
                    {gift.effectType === 'extra_time' && `+${gift.effectValue}s Extra`}
                    {gift.effectType === 'fifty_fifty' && 'Pista 50/50'}
                    {gift.effectType === 'streak_shield' && 'Escudo Racha'}
                    {gift.effectType === 'bonus_points' && `+${gift.effectValue} Pts`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

