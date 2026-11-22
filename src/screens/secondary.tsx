import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Background, Header, PrimaryButton, StatTile, ToggleRow, FadeIn, AnswerCard } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import { useT, localize, applyLayoutDirection } from '../i18n';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { ACHIEVEMENTS } from '../lib/achievements';
import { dailyQuestion } from '../lib/questions';
import { syncMusic, playSfx } from '../lib/sounds';
import { ALL_QUESTIONS } from '../data/questions';
import * as Updates from 'expo-updates';

// Short OTA tag so users can confirm an update arrived (Settings screen).
let otaTag = '';
try {
  otaTag = Updates.updateId ? `OTA ${Updates.updateId.slice(-6)}` : '';
} catch {
  otaTag = '';
}
import type { RootStackParamList } from '../navigation/types';
import type { CategoryId, Question, VoteChoice } from '../types';

export function StatsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Stats'>) {
  const { t } = useT();
  const { answered, history } = useProgress();
  const withMaj = answered.filter((a) => a.majorityChoice != null && a.majorityChoice === a.choice).length;
  const against = answered.filter((a) => a.majorityChoice != null && a.majorityChoice !== a.choice).length;
  const aPicks = answered.filter((a) => a.choice === 'A').length;
  const side = answered.length === 0 ? '—' : aPicks >= answered.length / 2 ? 'A' : 'B';
  const avgMs = answered.length ? answered.reduce((s, a) => s + a.timeToAnswerMs, 0) / answered.length : 0;

  return (
    <Background>
      <Header title={t('stats')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.tileRow}><StatTile label={t('questionsAnswered')} value={answered.length} /><StatTile label={t('gamesPlayed')} value={history.length} /></View>
        <View style={styles.tileRow}><StatTile label={t('timesWithMajority')} value={withMaj} /><StatTile label={t('timesAgainst')} value={against} /></View>
        <View style={styles.tileRow}><StatTile label={t('mostPickedSide')} value={side} /><StatTile label={t('avgAnswerTime')} value={`${(avgMs / 1000).toFixed(1)}${t('seconds')}`} /></View>
      </ScrollView>
    </Background>
  );
}

export function LeaderboardScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Leaderboard'>) {
  const { t } = useT();
  const { history, answered } = useProgress();
  // Local leaderboard: majority-alignment across named players is approximated
  // from game history participation and answer volume on this device.
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of history) for (const p of g.players) counts.set(p, (counts.get(p) ?? 0) + g.rounds);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [history]);

  return (
    <Background>
      <Header title={t('leaderboard' as never)} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        {rows.length === 0 && <Text style={styles.empty}>{t('noHistory')}</Text>}
        {rows.map(([name, score], i) => (
          <View key={name} style={styles.leaderRow}>
            <Text style={styles.leaderRank}>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</Text>
            <Text style={styles.leaderName}>{name}</Text>
            <Text style={styles.leaderScore}>{score}</Text>
          </View>
        ))}
      </ScrollView>
    </Background>
  );
}

export function AchievementsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Achievements'>) {
  const { t, language } = useT();
  const unlocked = useProgress((s) => s.unlockedAchievements);
  return (
    <Background>
      <Header title={t('achievements')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = Boolean(unlocked[a.id]);
          return (
            <View key={a.id} style={[styles.achRow, !isUnlocked && { opacity: 0.45 }]}>
              <Text style={{ fontSize: 30 }}>{isUnlocked ? a.icon : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.achTitle}>{localize(a.title, language)}</Text>
                <Text style={styles.achDesc}>{localize(a.description, language)}</Text>
              </View>
              <Text style={styles.achState}>{isUnlocked ? t('unlocked') : t('locked')}</Text>
            </View>
          );
        })}
      </ScrollView>
    </Background>
  );
}

export function FavoritesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Favorites'>) {
  const { t, language } = useT();
  const { favorites, customQuestions, toggleFavorite } = useProgress();
  const favs = useMemo(
    () => favorites.map((id) => customQuestions.find((q) => q.id === id) ?? ALL_QUESTIONS.find((q) => q.id === id)).filter(Boolean) as Question[],
    [favorites, customQuestions],
  );

  return (
    <Background>
      <Header title={t('favorites')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        {favs.length === 0 && <Text style={styles.empty}>{t('noFavorites')}</Text>}
        {favs.map((q) => (
          <View key={q.id} style={styles.favCard}>
            <Text style={styles.favText}>A: {localize(q.optionA, language)}</Text>
            <Text style={styles.favOr}>{t('or')}</Text>
            <Text style={styles.favText}>B: {localize(q.optionB, language)}</Text>
            <Pressable style={styles.favRemove} onPress={() => toggleFavorite(q.id)} hitSlop={8}>
              <Text style={{ color: colors.danger }}>✕</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Background>
  );
}

export function HistoryScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'History'>) {
  const { t } = useT();
  const history = useProgress((s) => s.history);
  return (
    <Background>
      <Header title={t('history')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        {history.length === 0 && <Text style={styles.empty}>{t('noHistory')}</Text>}
        {history.map((g) => (
          <View key={g.id} style={styles.histRow}>
            <Text style={{ fontSize: 22 }}>{g.kind === 'online' ? '🌐' : '👥'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.achTitle}>{t(`mode_${g.mode}` as never)}</Text>
              <Text style={styles.achDesc}>
                {t('playedOn', { date: new Date(g.at).toLocaleDateString() })} · {t('questionsShort', { n: g.rounds })}
                {g.players.length > 0 ? ` · ${g.players.join(', ')}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </Background>
  );
}

const CUSTOM_CATEGORIES: CategoryId[] = ['classic', 'friends', 'couples', 'deep', 'extreme', 'funny', 'adult'];

export function CustomQuestionsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'CustomQuestions'>) {
  const { t, language } = useT();
  const { customQuestions, addCustomQuestion, deleteCustomQuestion } = useProgress();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [category, setCategory] = useState<CategoryId>('friends');

  const save = () => {
    if (!a.trim() || !b.trim()) {
      Alert.alert(t('fillBothOptions'));
      return;
    }
    const q: Question = {
      id: `custom-${Date.now()}`,
      optionA: { en: a.trim(), ar: a.trim() },
      optionB: { en: b.trim(), ar: b.trim() },
      category,
      difficulty: 2,
      intensity: 3,
      tags: ['custom'],
      custom: true,
    };
    addCustomQuestion(q);
    setA(''); setB('');
    playSfx('win');
    Alert.alert(t('questionSaved'));
  };

  return (
    <Background>
      <Header title={t('customQuestions')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('createQuestion')}</Text>
        <TextInput style={styles.input} placeholder={t('optionAPlaceholder')} placeholderTextColor={colors.textMuted} value={a} onChangeText={setA} multiline maxLength={160} />
        <View style={{ height: spacing.sm }} />
        <TextInput style={styles.input} placeholder={t('optionBPlaceholder')} placeholderTextColor={colors.textMuted} value={b} onChangeText={setB} multiline maxLength={160} />
        <View style={styles.chipRow}>
          {CUSTOM_CATEGORIES.map((c) => (
            <Pressable key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{t(`cat_${c}` as never)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: spacing.md }} />
        <PrimaryButton title={t('saveQuestion')} onPress={save} />

        <View style={{ height: spacing.xl }} />
        {customQuestions.length === 0 && <Text style={styles.empty}>{t('noCustomQuestions')}</Text>}
        {customQuestions.map((q) => (
          <View key={q.id} style={styles.favCard}>
            <Text style={styles.favText}>A: {localize(q.optionA, language)}</Text>
            <Text style={styles.favOr}>{t('or')}</Text>
            <Text style={styles.favText}>B: {localize(q.optionB, language)}</Text>
            <Pressable style={styles.favRemove} onPress={() => deleteCustomQuestion(q.id)} hitSlop={8}>
              <Text style={{ color: colors.danger }}>🗑</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Background>
  );
}

export function DailyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Daily'>) {
  const { t, language } = useT();
  const progress = useProgress();
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = progress.daily.lastDate === today;
  const q = useMemo(() => dailyQuestion(today, progress.customQuestions), [today, progress.customQuestions]);
  const [choice, setChoice] = useState<VoteChoice | null>(null);

  const answer = (c: VoteChoice) => {
    if (doneToday || choice) return;
    setChoice(c);
    progress.recordAnswer({ questionId: q.id, choice: c, majorityChoice: null, mode: 'daily', at: Date.now(), timeToAnswerMs: 0 });
    progress.markDailyDone(today);
    playSfx('reveal');
  };

  return (
    <Background>
      <Header title={t('dailyChallenge')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <FadeIn>
          <Text style={styles.dailyEmoji}>📅</Text>
          <Text style={styles.dailyTitle}>{t('dailyTitle')}</Text>
          <Text style={styles.dailyStreak}>🔥 {t('dailyStreak', { n: progress.daily.streak })}</Text>
        </FadeIn>
        <View style={{ height: spacing.lg }} />
        <AnswerCard label="A" side="A" text={localize(q.optionA, language)} selected={choice === 'A'} disabled={doneToday} onPress={() => answer('A')} />
        <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>{t('or')}</Text><View style={styles.orLine} /></View>
        <AnswerCard label="B" side="B" text={localize(q.optionB, language)} selected={choice === 'B'} disabled={doneToday} onPress={() => answer('B')} />
        {(doneToday || choice) && (
          <FadeIn>
            <Text style={styles.dailyDone}>{t('dailyDone')}</Text>
            <PrimaryButton
              title={t('shareResult')}
              variant="ghost"
              onPress={() => void Share.share({ message: `Daily dilemma: ${q.optionA.en} — or — ${q.optionB.en}. What's your pick?` }).catch(() => {})}
            />
          </FadeIn>
        )}
      </ScrollView>
    </Background>
  );
}

export function SettingsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const { t, language } = useT();
  const settings = useSettings();
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'found' | 'ready' | 'none' | 'error'>('idle');

  const checkForUpdates = async () => {
    if (updateStatus === 'checking') return;
    setUpdateStatus('checking');
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setUpdateStatus('none');
        return;
      }
      setUpdateStatus('found');
      await Updates.fetchUpdateAsync();
      setUpdateStatus('ready');
      setTimeout(() => void Updates.reloadAsync(), 1200);
    } catch {
      setUpdateStatus('error');
    }
  };

  const updateMessage =
    updateStatus === 'found' ? t('updateFound')
    : updateStatus === 'ready' ? t('updateReady')
    : updateStatus === 'none' ? t('updateNone')
    : updateStatus === 'error' ? t('updateError')
    : '';

  const switchLanguage = async () => {
    const next = language === 'en' ? 'ar' : 'en';
    settings.setLanguage(next);
    await applyLayoutDirection(next);
  };

  return (
    <Background>
      <Header title={t('settings')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.langRow} onPress={() => void switchLanguage()}>
          <Text style={styles.toggleLabel}>{t('language')}</Text>
          <Text style={styles.langValue}>{language === 'en' ? t('languageEn') : t('languageAr')}</Text>
        </Pressable>
        <ToggleRow label={t('sounds')} value={settings.sounds} onChange={settings.setSounds} />
        <ToggleRow label={t('music')} value={settings.music} onChange={(v) => { settings.setMusic(v); syncMusic(); }} />
        <ToggleRow label={t('haptics')} value={settings.haptics} onChange={settings.setHaptics} />

        <View style={{ height: spacing.lg }} />
        <PrimaryButton
          title={updateStatus === 'checking' ? t('updateChecking') : t('checkUpdates')}
          variant="ghost"
          onPress={() => void checkForUpdates()}
          disabled={updateStatus === 'checking'}
        />
        {updateMessage ? <Text style={styles.updateStatus}>{updateMessage}</Text> : null}
        <Text style={styles.updateStatus}>
          {t('updateCurrent')}: {Updates.updateId ? Updates.updateId.slice(0, 8) : '—'}
        </Text>
        <View style={{ height: spacing.lg }} />
        <PrimaryButton
          title={t('resetProgress')}
          variant="danger"
          onPress={() =>
            Alert.alert(t('resetConfirmTitle'), t('resetConfirmBody'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('confirm'), style: 'destructive', onPress: () => void settings.resetAll().then(() => navigation.popToTop()) },
            ])
          }
        />
        <View style={{ height: spacing.xl }} />
        <Text style={styles.about}>{t('appName')} · {t('version')} 1.1.0{otaTag ? ` · ${otaTag}` : ''}</Text>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  tileRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  empty: { color: colors.textMuted, ...typography.body, textAlign: 'center', marginTop: spacing.xxl },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft },
  leaderRank: { fontSize: 20, width: 36, textAlign: 'center' },
  leaderName: { flex: 1, color: colors.text, ...typography.bodyBold },
  leaderScore: { color: colors.primary, ...typography.bodyBold },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft },
  achTitle: { color: colors.text, ...typography.bodyBold },
  achDesc: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
  achState: { color: colors.textMuted, ...typography.small },
  favCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft },
  favText: { color: colors.text, ...typography.body, textAlign: 'center' },
  favOr: { color: colors.textMuted, ...typography.caption, textAlign: 'center', marginVertical: spacing.xs },
  favRemove: { position: 'absolute', top: spacing.sm, end: spacing.sm },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft },
  sectionLabel: { color: colors.textSecondary, ...typography.caption, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border, minHeight: 60 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, ...typography.caption },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  dailyEmoji: { fontSize: 48, textAlign: 'center' },
  dailyTitle: { color: colors.text, ...typography.h2, textAlign: 'center', marginTop: spacing.sm },
  dailyStreak: { color: colors.warning, ...typography.bodyBold, textAlign: 'center', marginTop: spacing.sm },
  dailyDone: { color: colors.textSecondary, ...typography.body, textAlign: 'center', marginVertical: spacing.lg },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, ...typography.bodyBold, marginHorizontal: spacing.md },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft },
  toggleLabel: { color: colors.text, ...typography.body },
  langValue: { color: colors.primary, ...typography.bodyBold },
  about: { color: colors.textMuted, ...typography.caption, textAlign: 'center' },
  updateStatus: { color: colors.textSecondary, ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
});
