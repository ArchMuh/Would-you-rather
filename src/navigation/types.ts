import type { GameModeId } from '../types';

export type RootStackParamList = {
  Splash: undefined;
  LanguageSelection: undefined;
  Onboarding: undefined;
  Main: undefined;
  Modes: undefined;
  Categories: { mode: GameModeId };
  PlayerSetup: { mode: GameModeId };
  Gameplay: undefined;
  GameOver: undefined;
  OnlineSetup: undefined;
  Lobby: undefined;
  OnlineGame: undefined;
  Daily: undefined;
  Stats: undefined;
  Leaderboard: undefined;
  Achievements: undefined;
  Favorites: undefined;
  History: undefined;
  CustomQuestions: undefined;
  Settings: undefined;
  AgeGate: { mode: GameModeId };
};
