import { create } from 'zustand';
import { getJSON, setJSON, clearAll } from '../lib/storage';
import { deviceLanguage } from '../i18n';
import type { Language } from '../types';

interface SettingsState {
  hydrated: boolean;
  language: Language;
  languageChosen: boolean;
  sounds: boolean;
  music: boolean;
  haptics: boolean;
  adultVerified: boolean;
  onboardingDone: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (l: Language) => void;
  setSounds: (v: boolean) => void;
  setMusic: (v: boolean) => void;
  setHaptics: (v: boolean) => void;
  setAdultVerified: (v: boolean) => void;
  setOnboardingDone: () => void;
  resetAll: () => Promise<void>;
}

const DEFAULTS = {
  language: deviceLanguage(),
  languageChosen: false,
  sounds: true,
  music: false,
  haptics: true,
  adultVerified: false,
  onboardingDone: false,
};

export const useSettings = create<SettingsState>((set, get) => ({
  hydrated: false,
  ...DEFAULTS,
  hydrate: async () => {
    const saved = await getJSON('settings', DEFAULTS);
    set({ ...DEFAULTS, ...saved, hydrated: true });
  },
  setLanguage: (language) => {
    set({ language, languageChosen: true });
    persist(get);
  },
  setSounds: (sounds) => {
    set({ sounds });
    persist(get);
  },
  setMusic: (music) => {
    set({ music });
    persist(get);
  },
  setHaptics: (haptics) => {
    set({ haptics });
    persist(get);
  },
  setAdultVerified: (adultVerified) => {
    set({ adultVerified });
    persist(get);
  },
  setOnboardingDone: () => {
    set({ onboardingDone: true });
    persist(get);
  },
  resetAll: async () => {
    await clearAll();
    set({ ...DEFAULTS, hydrated: true });
  },
}));

function persist(get: () => SettingsState) {
  const s = get();
  void setJSON('settings', {
    language: s.language,
    languageChosen: s.languageChosen,
    sounds: s.sounds,
    music: s.music,
    haptics: s.haptics,
    adultVerified: s.adultVerified,
    onboardingDone: s.onboardingDone,
  });
}
