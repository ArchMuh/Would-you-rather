import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import en, { Strings } from './en';
import ar from './ar';
import { useSettings } from '../store/settings';
import type { Language } from '../types';

const dictionaries: Record<Language, Strings> = { en, ar };

export function deviceLanguage(): Language {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return tag === 'ar' ? 'ar' : 'en';
}

type Vars = Record<string, string | number>;

export function translate(lang: Language, key: keyof Strings, vars?: Vars): string {
  let s: string = dictionaries[lang][key] ?? dictionaries.en[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{{${k}}}`).join(String(v));
    }
  }
  return s;
}

export function useT() {
  const language = useSettings((s) => s.language);
  const isRTL = language === 'ar';
  const t = (key: keyof Strings, vars?: Vars) => translate(language, key, vars);
  return { t, language, isRTL };
}

/** Apply RTL layout direction. A changed direction requires an app reload. */
export async function applyLayoutDirection(language: Language) {
  const shouldBeRTL = language === 'ar';
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(shouldBeRTL);
    try {
      await Updates.reloadAsync();
    } catch {
      // dev client or missing updates module: user restarts manually
    }
  }
}

export function localize(text: { en: string; ar: string }, lang: Language): string {
  return lang === 'ar' ? text.ar : text.en;
}
