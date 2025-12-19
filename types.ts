
export enum Language {
  ENGLISH = 'English',
  TAMIL = 'Tamil',
  MIXED = 'Mixed'
}

export enum GameMode {
  CHAOS = 'CHAOS', // Sarcastic, Roasting, "Confidently Wrong"
  GENIUS = 'GENIUS' // Factual, Competitive, "Confidently Right"
}

export enum GameStage {
  LOBBY = 'LOBBY',
  LOADING = 'LOADING', // New state for AI thinking transitions
  EXPLANATION = 'EXPLANATION',
  TOPIC_SELECTION = 'TOPIC_SELECTION',
  QUESTION = 'QUESTION',
  VOTING_RESULTS = 'VOTING_RESULTS',
  REVEAL = 'REVEAL',
  ARGUMENT = 'ARGUMENT',
  DASHBOARD = 'DASHBOARD',
  FINAL = 'FINAL'
}

export interface Player {
  id: string;
  name: string;
  age: number;
  score: number;
  lastAnswer?: string;
  isTopicSelector?: boolean;
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
  type: string;
}

export interface GameState {
  roomCode: string;
  stage: GameStage;
  mode: GameMode;
  players: Player[];
  language: Language; 
  topic?: string;
  topicOptions: string[];
  round: number;
  history: string[]; // Stores previous questions and topics to prevent repetition
  challengerId?: string;
  isWarmup: boolean;
  currentQuestion?: GameQuestion;
  topicPickerId?: string;
}
