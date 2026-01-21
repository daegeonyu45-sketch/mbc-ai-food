
export enum GameState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT',
  FINISHED = 'FINISHED',
  RANKING = 'RANKING'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface FoodItem {
  name: string;
  description: string;
  hint: string;
  imageUrl?: string;
}

export interface QuizResult {
  isCorrect: boolean;
  feedback: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  difficulty: Difficulty;
  date: string;
}
