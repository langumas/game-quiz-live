import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Category,
  GameConfig,
  GiftConfig,
  Participant,
  Question,
} from '../shared/types.js';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_GAME_CONFIG,
  DEFAULT_GIFTS,
  DEFAULT_QUESTIONS,
} from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

export interface PersistedStore {
  categories: Category[];
  questions: Question[];
  gifts: GiftConfig[];
  config: GameConfig;
  participants: Record<string, Participant>;
  totalLikes: number;
  likeGoalsCompleted: number;
}

export class StorageRepository {
  private store: PersistedStore;
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.store = this.loadFromDisk();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[Storage] Supabase client configurado y listo.');
    }
  }

  private loadFromDisk(): PersistedStore {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PersistedStore>;
        return {
          categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
          questions: parsed.questions?.length ? parsed.questions : DEFAULT_QUESTIONS,
          gifts: parsed.gifts?.length ? parsed.gifts : DEFAULT_GIFTS,
          config: { ...DEFAULT_GAME_CONFIG, ...(parsed.config || {}) },
          participants: parsed.participants || {},
          totalLikes: parsed.totalLikes ?? 0,
          likeGoalsCompleted: parsed.likeGoalsCompleted ?? 0,
        };
      }
    } catch (err) {
      console.error('[Storage] Error leyendo store.json, usando valores por defecto:', err);
    }

    const initial: PersistedStore = {
      categories: DEFAULT_CATEGORIES,
      questions: DEFAULT_QUESTIONS,
      gifts: DEFAULT_GIFTS,
      config: DEFAULT_GAME_CONFIG,
      participants: {},
      totalLikes: 0,
      likeGoalsCompleted: 0,
    };
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(data: PersistedStore = this.store): void {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Storage] Error guardando store.json:', err);
    }
  }

  public getCategories(): Category[] {
    return this.store.categories;
  }

  public saveCategories(categories: Category[]): Category[] {
    this.store.categories = categories;
    this.saveToDisk();
    return this.store.categories;
  }

  public getQuestions(): Question[] {
    return this.store.questions;
  }

  public saveQuestions(questions: Question[]): Question[] {
    this.store.questions = questions;
    this.saveToDisk();
    return this.store.questions;
  }

  public addOrUpdateQuestion(question: Question): Question[] {
    const idx = this.store.questions.findIndex((q) => q.id === question.id);
    if (idx >= 0) {
      this.store.questions[idx] = question;
    } else {
      this.store.questions.unshift(question);
    }
    this.saveToDisk();
    return this.store.questions;
  }

  public deleteQuestion(id: string): Question[] {
    this.store.questions = this.store.questions.filter((q) => q.id !== id);
    this.saveToDisk();
    return this.store.questions;
  }

  public getGifts(): GiftConfig[] {
    return this.store.gifts;
  }

  public saveGifts(gifts: GiftConfig[]): GiftConfig[] {
    this.store.gifts = gifts;
    this.saveToDisk();
    return this.store.gifts;
  }

  public getConfig(): GameConfig {
    return this.store.config;
  }

  public updateConfig(partial: Partial<GameConfig>): GameConfig {
    this.store.config = {
      ...this.store.config,
      ...partial,
      pointsByDifficulty: {
        ...this.store.config.pointsByDifficulty,
        ...(partial.pointsByDifficulty || {}),
      },
    };
    this.saveToDisk();
    return this.store.config;
  }

  public getParticipantsMap(): Record<string, Participant> {
    return this.store.participants;
  }

  public saveParticipantsMap(map: Record<string, Participant>): void {
    this.store.participants = map;
    this.saveToDisk();
  }

  public getLikesData(): { totalLikes: number; likeGoalsCompleted: number } {
    return {
      totalLikes: this.store.totalLikes,
      likeGoalsCompleted: this.store.likeGoalsCompleted,
    };
  }

  public saveLikesData(totalLikes: number, likeGoalsCompleted: number): void {
    this.store.totalLikes = totalLikes;
    this.store.likeGoalsCompleted = likeGoalsCompleted;
    this.saveToDisk();
  }

  public resetRankingAndStats(): void {
    this.store.participants = {};
    this.store.totalLikes = 0;
    this.store.likeGoalsCompleted = 0;
    this.saveToDisk();
  }

  public isSupabaseConfigured(): boolean {
    return this.supabase !== null;
  }
}

