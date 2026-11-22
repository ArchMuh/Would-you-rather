import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Background, PrimaryButton, FadeIn } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import { useT, applyLayoutDirection } from '../i18n';
import { useSettings } from '../store/settings';
import { useProgress } from '../store/progress';
import { initAudio } from '../lib/sounds';
import type { RootStackParamList } from '../navigation/types';
import type { Language } from '../types';

export function SplashScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Splash'>) {
  const settingsHydrated = useSettings((s) => s.hydrated);
  const progressHydrated = useProgress((s) => s.hydrated);

  useEffect(() => {
    void useSettings.getState().hydrate();
    void useProgress.getState().hydrate();
    void initAudio();
  }, []);

  useEffect(() => {
    if (!settingsHydrated || !progressHydrated) return;
    const { languageChosen, onboardingDone, language } = useSettings.getState();
    void applyLayoutDirection(language);
    const dest: 'LanguageSelection' | 'Onboarding' | 'Main' =
      !languageChosen ? 'LanguageSelection' : !onboardingDone ? 'Onboarding' : 'Main';
    const t = setTimeout(() => navigation.replace(dest), 900);
    return () => clearTimeout(t);
  }, [settingsHydrated, progressHydrated, navigation]);

  return (
    <Background>
      <View style={styles.center}>
        <Text style={styles.logo}>🤔</Text>
        <Text style={styles.logoTitle}>Would You Rather</Text>
      </View>
    </Background>
  );
}

export function LanguageSelectionScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'LanguageSelection'>) {
  const { t } = useT();
  const setLanguage = useSettings((s) => s.setLanguage);
  const pick = async (l: Language) => {
    setLanguage(l);
    await applyLayoutDirection(l);
    navigation.replace('Onboarding');
  };
  return (
    <Background>
      <View style={styles.center}>
        <Text style={styles.logo}>🌍</Text>
        <Text style={styles.h1}>{t('language')}</Text>
        <View style={{ height: spacing.lg }} />
        <View style={{ width: '80%', gap: spacing.md }}>
          <PrimaryButton title="English" onPress={() => void pick('en')} />
          <PrimaryButton title="العربية" onPress={() => void pick('ar')} variant="ghost" />
        </View>
      </View>
    </Background>
  );
}

const SLIDES = [
  { emoji: '🤯', titleKey: 'onboarding1Title', bodyKey: 'onboarding1Body' },
  { emoji: '📱', titleKey: 'onboarding2Title', bodyKey: 'onboarding2Body' },
  { emoji: '🔥', titleKey: 'onboarding3Title', bodyKey: 'onboarding3Body' },
] as const;

export function OnboardingScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Onboarding'>) {
  const { t } = useT();
  const [idx, setIdx] = useState(0);
  const done = () => {
    useSettings.getState().setOnboardingDone();
    navigation.replace('Main');
  };
  const slide = SLIDES[idx];
  return (
    <Background>
      <View style={{ alignItems: 'flex-end', padding: spacing.md }}>
        <Pressable onPress={done} hitSlop={12}><Text style={styles.skipText}>{t('skip')}</Text></Pressable>
      </View>
      <View style={styles.center}>
        <FadeIn key={idx}>
          <Text style={styles.slideEmoji}>{slide.emoji}</Text>
          <Text style={styles.h1}>{t(slide.titleKey)}</Text>
          <Text style={styles.body}>{t(slide.bodyKey)}</Text>
        </FadeIn>
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton
          title={idx === SLIDES.length - 1 ? t('getStarted') : t('next')}
          onPress={() => (idx === SLIDES.length - 1 ? done() : setIdx(idx + 1))}
        />
      </View>
    </Background>
  );
}

export function AgeGateScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'AgeGate'>) {
  const { t } = useT();
  return (
    <Background>
      <View style={styles.center}>
        <Text style={styles.slideEmoji}>🔞</Text>
        <Text style={styles.h1}>{t('ageTitle')}</Text>
        <Text style={styles.body}>{t('ageBody')}</Text>
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <PrimaryButton
          title={t('ageConfirm')}
          onPress={() => {
            useSettings.getState().setAdultVerified(true);
            navigation.replace('PlayerSetup', { mode: route.params.mode });
          }}
        />
        <PrimaryButton title={t('ageDeny')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  logo: { fontSize: 72 },
  logoTitle: { color: colors.text, ...typography.h1, marginTop: spacing.md, textAlign: 'center' },
  h1: { color: colors.text, ...typography.h1, textAlign: 'center', marginTop: spacing.lg },
  body: { color: colors.textSecondary, ...typography.body, textAlign: 'center', marginTop: spacing.md, maxWidth: 320 },
  slideEmoji: { fontSize: 84, textAlign: 'center' },
  skipText: { color: colors.textSecondary, ...typography.bodyBold },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
});
