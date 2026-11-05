import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Eye,
  Flag,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Sparkles,
  Heart,
  Gift,
  Plus,
  Trash2,
  Edit3,
  Trophy,
  Settings,
  BookOpen,
  Gamepad2,
  Volume2,
  VolumeX,
  Layers,
  Zap,
  Users,
  MessageSquare,
  Shield,
  Flame,
  Search,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  Category,
  Difficulty,
  GiftEffectType,
  OptionKey,
  Question,
} from '../../shared/types';
import { OverlayView } from './OverlayView';

type AdminTab = 'live' | 'tiktok' | 'questions' | 'settings' | 'ranking';

const TEST_PRESET_PLAYERS = [
  { uniqueId: 'pixel_hunter', nickname: 'PixelHunter99' },
  { uniqueId: 'valkyrie_gg', nickname: 'Valkyrie_GG' },
  { uniqueId: 'kratos_latam', nickname: 'KratosLatam' },
  { uniqueId: 'zelda_fan', nickname: 'HyruleHero' },
  { uniqueId: 'cyber_ninja', nickname: 'CyberNinjaX' },
];

export const AdminDashboard: React.FC = () => {
  const {
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
  } = useGame();

  const [activeTab, setActiveTab] = useState<AdminTab>('live');
  const [copiedObs, setCopiedObs] = useState(false);

  // Simulator state
  const [simUser, setSimUser] = useState(TEST_PRESET_PLAYERS[0].uniqueId);
  const [simNickname, setSimNickname] = useState(TEST_PRESET_PLAYERS[0].nickname);
  const [simCustomComment, setSimCustomComment] = useState('');

  // TikTok connection form state
  const [tiktokUsernameInput, setTiktokUsernameInput] = useState('');
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokFeedback, setTiktokFeedback] = useState<string | null>(null);

  // Question CRUD state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🕹️');
  const [newCatColor, setNewCatColor] = useState('#00f0ff');

  // Ranking search state
  const [rankingSearch, setRankingSearch] = useState('');

  if (!state || !config) {
    return (
      <div className="min-h-screen bg-[#070913] text-white flex items-center justify-center font-display text-xl">
        Cargando Panel de Control de Game Quiz Live...
      </div>
    );
  }

  const obsOverlayUrl = `${window.location.origin}/overlay`;

  const handleCopyObsUrl = () => {
    navigator.clipboard.writeText(obsOverlayUrl);
    setCopiedObs(true);
    setTimeout(() => setCopiedObs(false), 2200);
  };

  const handleSelectPresetPlayer = (uniqueId: string, nickname: string) => {
    setSimUser(uniqueId);
    setSimNickname(nickname);
  };

  const handleConnectTikTok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokUsernameInput.trim()) return;
    setTiktokLoading(true);
    setTiktokFeedback(null);
    const res = await connectTikTok(tiktokUsernameInput);
    setTiktokLoading(false);
    if (!res.ok) {
      setTiktokFeedback(res.error || 'No se pudo conectar a TikTok LIVE');
    } else {
      setTiktokFeedback('¡Conectado exitosamente al LIVE de TikTok!');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.values(q.options).some((opt) =>
        opt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCat = filterCat === 'all' || q.categoryId === filterCat;
    const matchesDiff = filterDiff === 'all' || q.difficulty === filterDiff;
    return matchesSearch && matchesCat && matchesDiff;
  });

  const filteredLeaderboard = state.leaderboard.filter(
    (p) =>
      p.nickname.toLowerCase().includes(rankingSearch.toLowerCase()) ||
      p.uniqueId.toLowerCase().includes(rankingSearch.toLowerCase())
  );

  const openNewQuestionForm = () => {
    setEditingQuestion({
      id: `q-${Date.now()}`,
      text: '',
      options: { A: '', B: '', C: '', D: '' },
      correctOption: 'A',
      categoryId: categories[0]?.id || 'nintendo',
      difficulty: 'medio',
      explanation: '',
    });
  };

  const handleSaveQuestionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.text.trim()) return;
    saveQuestion(editingQuestion);
    setEditingQuestion(null);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const id = newCatName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_');
    saveCategories([
      ...categories,
      { id: `${id}_${Date.now().toString().slice(-3)}`, name: newCatName.trim(), icon: newCatIcon || '🎮', color: newCatColor },
    ]);
    setNewCatName('');
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col">
      {/* ==================== TOP HEADER ==================== */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display font-black text-xl tracking-wider text-white">
                GAME QUIZ <span className="text-cyan-400">LIVE</span>
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                PANEL DE CONTROL & OBS
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs mt-0.5">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />
                {socketConnected ? 'Servidor Sincronizado' : 'Desconectado'}
              </span>
              <span className="text-slate-600">|</span>
              {state.tiktokStatus.connected ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> TikTok LIVE: @
                  {state.tiktokStatus.username} ({state.tiktokStatus.viewerCount ?? 0}{' '}
                  viewers)
                </span>
              ) : (
                <span className="text-amber-400 font-medium">
                  🛠️ Modo Prueba / Simulación Activo (Sin conexión a TikTok)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick OBS & Audio Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => updateConfig({ soundEnabled: !config.soundEnabled })}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
              config.soundEnabled
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Activar/Desactivar efectos de sonido en el Overlay"
          >
            {config.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            Sonido {config.soundEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() =>
              updateConfig({ transparentOverlay: !config.transparentOverlay })
            }
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
              config.transparentOverlay
                ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
            title="Alternar fondo transparente para sobreponer sobre tu cámara/juego en OBS"
          >
            <Layers className="w-4 h-4" />
            {config.transparentOverlay ? 'Fondo OBS: Transparente' : 'Fondo OBS: Cyber'}
          </button>

          <button
            onClick={handleCopyObsUrl}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center gap-2 text-slate-200 transition"
          >
            {copiedObs ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">¡URL Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>Copiar URL OBS (1080×1920)</span>
              </>
            )}
          </button>

          <a
            href="/overlay"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition"
          >
            <span>Abrir Overlay</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT / CENTER COLUMN (8 cols on XL): TABS & CONTROLS */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          {/* Navigation Tabs */}
          <nav className="flex flex-wrap gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            {[
              { id: 'live', label: 'Control en Vivo & Simulador', icon: Gamepad2 },
              { id: 'tiktok', label: 'TikTok LIVE', icon: Radio },
              {
                id: 'questions',
                label: `Preguntas (${questions.length})`,
                icon: BookOpen,
              },
              { id: 'settings', label: 'Tiempo, Puntos y Regalos', icon: Settings },
              {
                id: 'ranking',
                label: `Ranking (${state.totalParticipants})`,
                icon: Trophy,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl font-display font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/25 to-fuchsia-500/25 border border-cyan-400/50 text-white shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* -------------------- TAB 1: LIVE CONTROL & SIMULATOR -------------------- */}
          {activeTab === 'live' && (
            <div className="flex flex-col gap-6">
              {/* Match Director Card */}
              <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                      <Play className="w-5 h-5 text-cyan-400" /> Dirección de Partida en
                      Vivo
                    </h2>
                    <p className="text-xs text-slate-400">
                      Controla las rondas, pausas, revelación de respuestas y podio en
                      tiempo real.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-cyan-300 font-bold">
                      FASE: {state.phase}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-amber-300 font-bold">
                      RONDA #{state.roundNumber}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-emerald-300 font-bold">
                      ⏱️ {state.timeRemainingSec}s
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <button
                    onClick={() => startMatch()}
                    className="py-3.5 px-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-display font-black text-xs uppercase flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Iniciar Partida</span>
                  </button>

                  <button
                    onClick={() => nextQuestion()}
                    className="py-3.5 px-4 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-display font-bold text-xs uppercase flex flex-col items-center justify-center gap-1.5 transition"
                  >
                    <SkipForward className="w-5 h-5 text-cyan-400" />
                    <span>Siguiente Pregunta</span>
                  </button>

                  <button
                    onClick={pauseMatch}
                    disabled={state.phase !== 'QUESTION' && state.phase !== 'PAUSED'}
                    className="py-3.5 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/50 text-amber-200 font-display font-bold text-xs uppercase flex flex-col items-center justify-center gap-1.5 transition"
                  >
                    <Pause className="w-5 h-5 text-amber-400" />
                    <span>
                      {state.phase === 'PAUSED' ? 'Reanudar' : 'Pausar Reloj'}
                    </span>
                  </button>

                  <button
                    onClick={revealAnswer}
                    disabled={state.phase !== 'QUESTION' && state.phase !== 'PAUSED'}
                    className="py-3.5 px-4 rounded-2xl bg-violet-500/20 hover:bg-violet-500/30 disabled:opacity-40 border border-violet-400/50 text-violet-200 font-display font-bold text-xs uppercase flex flex-col items-center justify-center gap-1.5 transition"
                  >
                    <Eye className="w-5 h-5 text-violet-400" />
                    <span>Revelar Ahora</span>
                  </button>

                  <button
                    onClick={endMatch}
                    className="py-3.5 px-4 rounded-2xl bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/50 text-fuchsia-200 font-display font-bold text-xs uppercase flex flex-col items-center justify-center gap-1.5 transition"
                  >
                    <Flag className="w-5 h-5 text-fuchsia-400" />
                    <span>Finalizar / Podio</span>
                  </button>

                  <button
                    onClick={returnToLobby}
                    className="py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-display font-bold text-xs uppercase flex flex-col items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-5 h-5 text-slate-400" />
                    <span>Ir al Lobby</span>
                  </button>
                </div>

                {/* Current Question Summary & Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                    <div className="text-xs font-display font-bold text-cyan-400 uppercase mb-1">
                      Pregunta Activa en Pantalla
                    </div>
                    {state.currentQuestion ? (
                      <>
                        <p className="text-sm font-bold text-white mb-2">
                          {state.currentQuestion.text}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {(['A', 'B', 'C', 'D'] as OptionKey[]).map((k) => {
                            const isCorrect =
                              state.currentQuestion?.correctOption === k;
                            return (
                              <div
                                key={k}
                                className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                                  isCorrect
                                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                }`}
                              >
                                <span className="truncate">
                                  <strong>{k}:</strong>{' '}
                                  {state.currentQuestion?.options[k]}
                                </span>
                                <span className="font-mono text-[11px] ml-1">
                                  ({state.optionDistribution[k]}v)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">
                        No hay pregunta activa. Haz clic en &ldquo;Iniciar Partida&rdquo; o
                        &ldquo;Siguiente Pregunta&rdquo;.
                      </p>
                    )}
                  </div>

                  {/* Quick Round Filters */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
                    <div className="text-xs font-display font-bold text-fuchsia-400 uppercase">
                      Filtro de Cola de Preguntas
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Categoría Activa
                        </label>
                        <select
                          value={config.selectedCategoryFilter}
                          onChange={(e) =>
                            updateConfig({ selectedCategoryFilter: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value="all">Todas las categorías</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Dificultad
                        </label>
                        <select
                          value={config.selectedDifficultyFilter}
                          onChange={(e) =>
                            updateConfig({ selectedDifficultyFilter: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value="all">Todas las dificultades</option>
                          <option value="facil">Fácil (+{config.pointsByDifficulty.facil})</option>
                          <option value="medio">Medio (+{config.pointsByDifficulty.medio})</option>
                          <option value="dificil">Difícil (+{config.pointsByDifficulty.dificil})</option>
                          <option value="experto">Experto (+{config.pointsByDifficulty.experto})</option>
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center justify-between pt-1 cursor-pointer">
                      <span className="text-xs text-slate-300 font-medium">
                        Avanzar automáticamente a la siguiente pregunta tras revelar
                      </span>
                      <input
                        type="checkbox"
                        checked={config.autoAdvance}
                        onChange={(e) =>
                          updateConfig({ autoAdvance: e.target.checked })
                        }
                        className="w-4 h-4 accent-cyan-400 rounded"
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* Simulation Deck (Manual Test Controls) */}
              <section className="bg-slate-950/90 border-2 border-amber-500/30 rounded-3xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-display font-bold text-[11px] uppercase">
                        MODO PRUEBA
                      </span>
                      <h2 className="font-display font-bold text-lg text-white">
                        Simulador de Interacciones de Espectadores
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Prueba respuestas A/B/C/D, rachas, metas de likes y poderes de
                      regalos sin necesidad de estar transmitiendo en vivo.
                    </p>
                  </div>

                  <button
                    onClick={simulateWaveAnswers}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-display font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Simular Oleada (6 Espectadores)</span>
                  </button>
                </div>

                {/* Test Player Selector */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium mr-1">
                      Espectador Activo:
                    </span>
                    {TEST_PRESET_PLAYERS.map((p) => (
                      <button
                        key={p.uniqueId}
                        onClick={() =>
                          handleSelectPresetPlayer(p.uniqueId, p.nickname)
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          simUser === p.uniqueId
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        @{p.nickname}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Usuario (@uniqueId)
                      </label>
                      <input
                        type="text"
                        value={simUser}
                        onChange={(e) => setSimUser(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        placeholder="ej. gamer_pro"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Nombre en Pantalla (Nickname)
                      </label>
                      <input
                        type="text"
                        value={simNickname}
                        onChange={(e) => setSimNickname(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        placeholder="ej. GamerPro99"
                      />
                    </div>
                  </div>
                </div>

                {/* Simulate Answer Buttons A, B, C, D */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-display font-bold text-cyan-400 uppercase flex items-center justify-between">
                      <span>1. Enviar Respuesta en el Chat</span>
                      {state.currentQuestion && (
                        <span className="text-[11px] text-emerald-400 font-mono">
                          Correcta actual: {state.currentQuestion.correctOption}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                      {(['A', 'B', 'C', 'D'] as OptionKey[]).map((letter) => {
                        const isCorrect =
                          state.currentQuestion?.correctOption === letter;
                        return (
                          <button
                            key={letter}
                            onClick={() =>
                              simulateComment(simUser, simNickname, letter)
                            }
                            className={`py-3 rounded-xl font-display font-black text-lg border transition flex flex-col items-center ${
                              isCorrect
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/60 text-emerald-300'
                                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-white'
                            }`}
                          >
                            <span>{letter}</span>
                            <span className="text-[10px] font-sans font-normal text-slate-400">
                              {isCorrect ? '✓ Correcta' : 'Opción'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom chat message */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!simCustomComment.trim()) return;
                        simulateComment(simUser, simNickname, simCustomComment);
                        setSimCustomComment('');
                      }}
                      className="flex gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={simCustomComment}
                        onChange={(e) => setSimCustomComment(e.target.value)}
                        placeholder="Escribir comentario libre (ej. 'opcion B' o '¡Hola!')"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300"
                      >
                        Enviar
                      </button>
                    </form>
                  </div>

                  {/* Simulate Likes & Gifts */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-display font-bold text-pink-400 uppercase">
                      2. Simular Likes y Regalos con Efectos
                    </div>

                    {/* Like bursts */}
                    <div className="flex items-center gap-2">
                      {[25, 100, 250].map((count) => (
                        <button
                          key={count}
                          onClick={() => simulateLike(simUser, simNickname, count)}
                          className="flex-1 py-2 px-3 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-300 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                          <span>+{count} Likes</span>
                        </button>
                      ))}
                    </div>

                    {/* Configured Gifts */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {gifts
                        .filter((g) => g.enabled)
                        .map((gift) => (
                          <button
                            key={gift.id}
                            onClick={() =>
                              simulateGift(
                                simUser,
                                simNickname,
                                gift.giftName,
                                gift.coins,
                                1
                              )
                            }
                            className="p-2 rounded-xl bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 text-left transition flex items-center gap-2"
                          >
                            <span className="text-xl">{gift.icon}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate">
                                {gift.giftName}
                              </div>
                              <div className="text-[10px] text-fuchsia-300 truncate">
                                {gift.coins} 🪙
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* -------------------- TAB 2: TIKTOK LIVE CONNECTION -------------------- */}
          {activeTab === 'tiktok' && (
            <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div>
                <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-rose-500" /> Integración con TikTok
                  LIVE
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Conecta la aplicación en vivo ingresando el @usuario que está
                  transmitiendo en TikTok LIVE. Si no hay conexión activa, el juego
                  opera exclusivamente con el Modo Prueba manual sin simular datos
                  falsos.
                </p>
              </div>

              <form
                onSubmit={handleConnectTikTok}
                className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl"
              >
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs text-slate-400 mb-1">
                    Usuario de TikTok en Vivo (sin necesidad de contraseña ni API Key)
                  </label>
                  <input
                    type="text"
                    value={tiktokUsernameInput}
                    onChange={(e) => setTiktokUsernameInput(e.target.value)}
                    placeholder="@usuario_tiktok"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>

                {state.tiktokStatus.connected ? (
                  <button
                    type="button"
                    onClick={disconnectTikTok}
                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs uppercase transition mt-5"
                  >
                    Desconectar LIVE
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={tiktokLoading}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 disabled:opacity-50 text-white font-display font-bold text-xs uppercase transition mt-5"
                  >
                    {tiktokLoading ? 'Conectando...' : 'Conectar a TikTok LIVE'}
                  </button>
                )}
              </form>

              {(tiktokFeedback || state.tiktokStatus.error) && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-medium ${
                    state.tiktokStatus.connected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {state.tiktokStatus.error || tiktokFeedback}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Modo de Operación</div>
                  <div className="font-display font-bold text-base text-white mt-1">
                    {state.tiktokStatus.mode === 'tiktok'
                      ? '🔴 TikTok LIVE Real'
                      : '🛠️ Modo Simulación Manual'}
                  </div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Sala / Room ID</div>
                  <div className="font-mono font-bold text-base text-cyan-400 mt-1">
                    {state.tiktokStatus.roomId || 'Sin sala activa'}
                  </div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs text-slate-400">Espectadores en Sala</div>
                  <div className="font-mono font-bold text-base text-emerald-400 mt-1">
                    {state.tiktokStatus.viewerCount ?? 0}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* -------------------- TAB 3: QUESTIONS & CATEGORIES -------------------- */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              {/* Question Editor Modal / Card when active */}
              {editingQuestion && (
                <form
                  onSubmit={handleSaveQuestionForm}
                  className="bg-slate-950 border-2 border-cyan-400/60 rounded-3xl p-6 space-y-4 neon-box-cyan"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-base text-cyan-300">
                      Crear / Editar Pregunta
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Pregunta
                    </label>
                    <input
                      type="text"
                      required
                      value={editingQuestion.text}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          text: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"
                      placeholder="Escribe la pregunta de videojuegos..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => (
                      <div key={key}>
                        <label className="block text-xs text-slate-400 mb-1">
                          Opción {key}
                        </label>
                        <input
                          type="text"
                          required
                          value={editingQuestion.options[key]}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              options: {
                                ...editingQuestion.options,
                                [key]: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Respuesta Correcta
                      </label>
                      <select
                        value={editingQuestion.correctOption}
                        onChange={(e) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            correctOption: e.target.value as OptionKey,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="A">Opción A</option>
                        <option value="B">Opción B</option>
                        <option value="C">Opción C</option>
                        <option value="D">Opción D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Categoría
                      </label>
                      <select
                        value={editingQuestion.categoryId}
                        onChange={(e) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            categoryId: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Dificultad
                      </label>
                      <select
                        value={editingQuestion.difficulty}
                        onChange={(e) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            difficulty: e.target.value as Difficulty,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="facil">Fácil</option>
                        <option value="medio">Medio</option>
                        <option value="dificil">Difícil</option>
                        <option value="experto">Experto</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Explicación / Dato Curioso (Se muestra al revelar la respuesta)
                    </label>
                    <input
                      type="text"
                      value={editingQuestion.explanation || ''}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          explanation: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      placeholder="Opcional..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-display font-bold text-xs"
                    >
                      Guardar Pregunta
                    </button>
                  </div>
                </form>
              )}

              {/* Question List & Filters */}
              <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display font-bold text-lg text-white">
                    Banco de Preguntas ({filteredQuestions.length})
                  </h2>
                  <button
                    onClick={openNewQuestionForm}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Nueva Pregunta
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar pregunta u opción..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
                    />
                  </div>
                  <select
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="all">Todas las categorías</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterDiff}
                    onChange={(e) => setFilterDiff(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="all">Todas las dificultades</option>
                    <option value="facil">Fácil</option>
                    <option value="medio">Medio</option>
                    <option value="dificil">Difícil</option>
                    <option value="experto">Experto</option>
                  </select>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredQuestions.map((q) => {
                    const cat = categories.find((c) => c.id === q.categoryId);
                    return (
                      <div
                        key={q.id}
                        className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold">
                              {cat?.icon} {cat?.name || q.categoryId}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 uppercase font-mono">
                              {q.difficulty}
                            </span>
                          </div>
                          <div className="font-bold text-sm text-white">
                            {q.text}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                            {(['A', 'B', 'C', 'D'] as OptionKey[]).map((k) => (
                              <span
                                key={k}
                                className={
                                  q.correctOption === k
                                    ? 'text-emerald-400 font-bold'
                                    : ''
                                }
                              >
                                {k}) {q.options[k]}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => nextQuestion(q.id)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1"
                            title="Lanzar esta pregunta inmediatamente en el show"
                          >
                            <Play className="w-3.5 h-3.5" /> Lanzar
                          </button>
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Category Manager */}
              <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-display font-bold text-base text-white">
                  Categorías de Videojuegos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 border flex items-center gap-2 text-xs"
                      style={{ borderColor: c.color }}
                    >
                      <span>{c.icon}</span>
                      <span className="font-bold text-white">{c.name}</span>
                      {categories.length > 1 && (
                        <button
                          onClick={() =>
                            saveCategories(categories.filter((x) => x.id !== c.id))
                          }
                          className="text-slate-500 hover:text-rose-400 ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-14 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-center text-sm"
                    placeholder="🎮"
                  />
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nueva categoría (ej. Terror & Survival)"
                    className="flex-1 min-w-[180px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-12 h-9 bg-slate-900 border border-slate-700 rounded-xl p-1 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300"
                  >
                    + Añadir Categoría
                  </button>
                </form>
              </section>
            </div>
          )}

          {/* -------------------- TAB 4: SETTINGS & GIFTS -------------------- */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Time, Points & Streaks Config */}
              <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-5">
                <h2 className="font-display font-bold text-lg text-white">
                  Configuración de Tiempo, Puntuaciones y Rachas
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Tiempo por Pregunta (seg)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={config.questionDurationSec}
                      onChange={(e) =>
                        updateConfig({
                          questionDurationSec: Number(e.target.value) || 20,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Tiempo de Revelación (seg)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={config.revealDurationSec}
                      onChange={(e) =>
                        updateConfig({
                          revealDurationSec: Number(e.target.value) || 6,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Meta de Likes (Objetivo)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={config.likeGoalTarget}
                      onChange={(e) =>
                        updateConfig({
                          likeGoalTarget: Number(e.target.value) || 500,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                {/* Base points by difficulty */}
                <div>
                  <label className="block text-xs font-display font-bold text-cyan-400 uppercase mb-2">
                    Puntos Base por Nivel de Dificultad
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['facil', 'medio', 'dificil', 'experto'] as Difficulty[]).map(
                      (diff) => (
                        <div key={diff}>
                          <label className="block text-[11px] text-slate-400 uppercase mb-1">
                            {diff}
                          </label>
                          <input
                            type="number"
                            step={25}
                            value={config.pointsByDifficulty[diff]}
                            onChange={(e) =>
                              updateConfig({
                                pointsByDifficulty: {
                                  ...config.pointsByDifficulty,
                                  [diff]: Number(e.target.value) || 100,
                                },
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Speed & Streak Bonuses */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Bono Máx. Velocidad
                    </label>
                    <input
                      type="number"
                      value={config.speedBonusMax}
                      onChange={(e) =>
                        updateConfig({
                          speedBonusMax: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Bono 1º en Acertar
                    </label>
                    <input
                      type="number"
                      value={config.firstAnswerBonus}
                      onChange={(e) =>
                        updateConfig({
                          firstAnswerBonus: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Mín. Aciertos para Racha
                    </label>
                    <input
                      type="number"
                      min={2}
                      value={config.streakBonusThreshold}
                      onChange={(e) =>
                        updateConfig({
                          streakBonusThreshold: Number(e.target.value) || 3,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Puntos Extra por Racha
                    </label>
                    <input
                      type="number"
                      value={config.streakBonusPerLevel}
                      onChange={(e) =>
                        updateConfig({
                          streakBonusPerLevel: Number(e.target.value) || 30,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </section>

              {/* Gift Effects Manager */}
              <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-fuchsia-400" /> Gestión de Efectos
                      de Regalos de TikTok
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configura qué poder o bonificación activa cada regalo en la
                      partida.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {gifts.map((gift, idx) => (
                    <div
                      key={gift.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-3 flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={gift.enabled}
                          onChange={(e) => {
                            const updated = [...gifts];
                            updated[idx] = { ...gift, enabled: e.target.checked };
                            saveGifts(updated);
                          }}
                          className="w-4 h-4 accent-fuchsia-500"
                        />
                        <span className="text-2xl">{gift.icon}</span>
                        <div>
                          <div className="font-bold text-sm text-white">
                            {gift.giftName}
                          </div>
                          <div className="text-xs text-amber-400 font-mono">
                            {gift.coins} monedas
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-4">
                        <select
                          value={gift.effectType}
                          onChange={(e) => {
                            const updated = [...gifts];
                            updated[idx] = {
                              ...gift,
                              effectType: e.target.value as GiftEffectType,
                            };
                            saveGifts(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                        >
                          <option value="bonus_points">Bono de Puntos Directo</option>
                          <option value="extra_time">Tiempo Extra (+Segundos)</option>
                          <option value="fifty_fifty">Comodín 50/50 (Descarta 1)</option>
                          <option value="streak_shield">Escudo Protector de Racha</option>
                          <option value="double_points">Ronda Puntos Dobles X2</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          value={gift.effectValue}
                          onChange={(e) => {
                            const updated = [...gifts];
                            updated[idx] = {
                              ...gift,
                              effectValue: Number(e.target.value) || 1,
                            };
                            saveGifts(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          title="Valor del efecto (Puntos o Segundos)"
                        />
                      </div>

                      <div className="sm:col-span-3 text-xs text-slate-400">
                        {gift.description}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* -------------------- TAB 5: PARTICIPANTS & LEADERBOARD -------------------- */}
          {activeTab === 'ranking' && (
            <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" /> Participantes y
                    Clasificación General ({state.totalParticipants})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Consulta estadísticas en tiempo real, ajusta puntuaciones o
                    reinicia el ranking.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rankingSearch}
                    onChange={(e) => setRankingSearch(e.target.value)}
                    placeholder="Buscar jugador..."
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          '¿Seguro que deseas reiniciar todos los puntos y participantes?'
                        )
                      ) {
                        resetLeaderboard();
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold"
                  >
                    Reiniciar Ranking
                  </button>
                </div>
              </div>

              {filteredLeaderboard.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-800 rounded-2xl">
                  No hay participantes registrados todavía. Usa el Simulador o inicia
                  una partida para ver el ranking.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-display uppercase">
                        <th className="py-3 px-3">#</th>
                        <th className="py-3 px-3">Jugador</th>
                        <th className="py-3 px-3">Puntos</th>
                        <th className="py-3 px-3">Aciertos</th>
                        <th className="py-3 px-3">Racha</th>
                        <th className="py-3 px-3">Likes / Regalos</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredLeaderboard.map((p, index) => (
                        <tr
                          key={p.uniqueId}
                          className="hover:bg-slate-900/50 transition"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                            #{index + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{p.nickname}</span>
                              {p.hasStreakShield && (
                                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              @{p.uniqueId}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-base text-amber-300">
                            {p.score}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {p.correctCount} / {p.totalAnswered}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-amber-400 font-mono font-bold">
                              <Flame className="w-3.5 h-3.5" /> {p.currentStreak}{' '}
                              <span className="text-slate-500 text-[10px]">
                                (máx {p.bestStreak})
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono">
                            ❤️ {p.likesSent} · 🎁 {p.giftsSent}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => adjustScore(p.uniqueId, 50)}
                              className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-mono font-bold"
                            >
                              +50
                            </button>
                            <button
                              onClick={() => adjustScore(p.uniqueId, -50)}
                              className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 font-mono font-bold"
                            >
                              -50
                            </button>
                            <button
                              onClick={() => removeParticipant(p.uniqueId)}
                              className="px-2 py-1 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ==================== RIGHT COLUMN (4 cols on XL): 9:16 OBS PREVIEW + LOG ==================== */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Live 9:16 Vertical Preview */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-display font-bold text-xs text-white uppercase tracking-wider">
                  Vista Previa OBS 9:16 (1080×1920)
                </span>
              </div>
              <a
                href="/overlay"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                Pantalla completa <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* 9:16 Aspect Ratio Container */}
            <div
              className="w-full max-w-[330px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-[0_0_35px_rgba(0,0,0,0.8)] relative bg-[#04060e]"
            >
              <OverlayView embedded />
            </div>
          </div>

          {/* Live Event Feed Console */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex-1 flex flex-col min-h-[260px] max-h-[360px]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-display font-bold text-xs text-slate-300 uppercase flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-cyan-400" /> Registro de
                Eventos en Tiempo Real
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {logs.length} eventos
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic py-8 text-center">
                  Los comentarios, respuestas, likes y regalos aparecerán aquí...
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`px-3 py-1.5 rounded-xl border flex items-start justify-between gap-2 ${
                      log.type === 'gift'
                        ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-200'
                        : log.type === 'answer'
                        ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200'
                        : log.type === 'system'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-bold text-white mr-1.5">
                        {log.nickname}:
                      </span>
                      <span>{log.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 uppercase">
                      {log.source === 'tiktok' ? 'LIVE' : 'SIM'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

