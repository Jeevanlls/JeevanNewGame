
export enum Language {
  ENGLISH = 'English',
  TAMIL = 'Tamil',
  MIXED = 'Mixed'
}

export enum GameMode {
  CONFIDENTLY_WRONG = 'CONFIDENTLY_WRONG',
  ACTUALLY_GENIUS = 'ACTUALLY_GENIUS'
}

export enum GameStage {
  LOBBY = 'LOBBY',
  TUTORIAL = 'TUTORIAL',
  LOADING = 'LOADING',
  WARMUP = 'WARMUP',
  SELECTOR_REVEAL = 'SELECTOR_REVEAL',
  TOPIC_SELECTION = 'TOPIC_SELECTION',
  QUESTION = 'QUESTION',
  VOTING_RESULTS = 'VOTING_RESULTS',
  REVEAL = 'REVEAL',
  DASHBOARD = 'DASHBOARD'
}

export interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  score: number;
  lastAnswer?: string;
  traits: string[]; 
  preferredLanguage: Language;
}

export interface GameOption {
  en: string;
  ta: string;
}

export interface GameQuestion {
  textEn: string;
  textTa: string;
  options: GameOption[];
  correctIndex: number;
  explanation: string;
}

export interface GameState {
  roomCode: string;
  stage: GameStage;
  mode: GameMode;
  players: Player[];
  language: Language; 
  occasion?: string;
  topic?: string;
  topicOptions: string[];
  round: number;
  history: string[];
  currentQuestion?: GameQuestion;
  topicPickerId?: string;
  hostRoast?: string;
  warmupQuestion?: string;
  reactions?: Reaction[];
  lastRoastTime?: number;
  isPaused?: boolean;
}
