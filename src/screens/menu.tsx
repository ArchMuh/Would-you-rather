import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Background, Header, PrimaryButton, ModeCard, FadeIn, AvatarCircle } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import { useT } from '../i18n';
import { useOnline } from '../store/online';
import { useGame } from '../store/game';
import { useProgress } from '../store/progress';
import { buildDeck } from '../lib/questions';
import { AVATARS } from '../constants/avatars';
import type { RootStackParamList } from '../navigation/types';
import type { CategoryId, GameModeId, Player } from '../types';
import { ALL_QUESTIONS } from '../data/questions';

export function MainMenuScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Main'>) {
  const { t } = useT();
  const onlineReady = useOnline((s) => s.configured);

  return (
    <Background>
      <ScrollView contentContainerStyle={styles.container}>
        <FadeIn>
          <Text style={styles.title}>🤔 Would You Rather</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </FadeIn>

        <View style={{ height: spacing.lg }} />
        <FadeIn delay={80}>
          <PrimaryButton title={`⚡ ${t('quickPlay')}`} onPress={() => navigation.navigate('Modes')} />
        </FadeIn>

        <View style={{ height: spacing.md }} />
        <FadeIn delay={140}>
          <ModeCard emoji="📅" title={t('dailyChallenge')} subtitle={t('dailyChallengeSub')} onPress={() => navigation.navigate('Daily')} />
          <ModeCard emoji="👥" title={t('localGame')} subtitle={t('localGameSub')} onPress={() => navigation.navigate('Modes')} />
          <ModeCard
            emoji="🌐"
            title={t('onlineGame')}
            subtitle={onlineReady ? t('onlineGameSub') : t('offlineMode')}
            locked={!onlineReady}
            onPress={() => onlineReady && navigation.navigate('OnlineSetup')}
          />
        </FadeIn>

        <View style={{ height: spacing.lg }} />
        <FadeIn delay={200}>
          <View style={styles.grid}>
            <MenuTile emoji="❤️" label={t('favorites')} onPress={() => navigation.navigate('Favorites')} />
            <MenuTile emoji="📊" label={t('stats')} onPress={() => navigation.navigate('Stats')} />
            <MenuTile emoji="🏆" label={t('achievements')} onPress={() => navigation.navigate('Achievements')} />
            <MenuTile emoji="🕘" label={t('history')} onPress={() => navigation.navigate('History')} />
            <MenuTile emoji="✍️" label={t('customQuestions')} onPress={() => navigation.navigate('CustomQuestions')} />
            <MenuTile emoji="⚙️" label={t('settings')} onPress={() => navigation.navigate('Settings')} />
          </View>
        </FadeIn>
      </ScrollView>
    </Background>
  );
}

function MenuTile({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const MODES: { id: GameModeId; emoji: string }[] = [
  { id: 'classic', emoji: '🎲' },
  { id: 'friends', emoji: '🎉' },
  { id: 'couples', emoji: '💜' },
  { id: 'heat', emoji: '🌶️' },
  { id: 'deep', emoji: '🌌' },
  { id: 'extreme', emoji: '🔥' },
  { id: 'funny', emoji: '😂' },
  { id: 'adult', emoji: '🔞' },
  { id: 'custom', emoji: '✍️' },
];

export function ModeSelectionScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Modes'>) {
  const { t } = useT();
  const adultVerified = useSettingsFlag();
  const customCount = useProgress((s) => s.customQuestions.length);

  const open = (mode: GameModeId) => {
    if ((mode === 'adult' || mode === 'heat') && !adultVerified) {
      navigation.navigate('AgeGate', { mode });
      return;
    }
    navigation.navigate('PlayerSetup', { mode });
  };

  return (
    <Background>
      <Header title={t('gameModes')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        {MODES.map((m, i) => (
          <FadeIn key={m.id} delay={i * 40}>
            <ModeCard
              emoji={m.emoji}
              title={t(`mode_${m.id}` as never)}
              subtitle={
                m.id === 'custom'
                  ? `${t('mode_custom_sub')} · ${customCount}`
                  : t(`mode_${m.id}_sub` as never)
              }
              locked={(m.id === 'adult' || m.id === 'heat') && !adultVerified}
              onPress={() => open(m.id)}
            />
          </FadeIn>
        ))}
      </ScrollView>
    </Background>
  );
}

// Small helper to avoid importing settings store twice in this file.
function useSettingsFlag(): boolean {
  return require('../store/settings').useSettings((s: any) => s.adultVerified) as boolean;
}

const CATEGORIES: (CategoryId | 'all')[] = ['all', 'classic', 'friends', 'couples', 'deep', 'extreme', 'funny'];

export function CategorySelectionScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Categories'>) {
  const { t } = useT();
  const { mode } = route.params;
  const [intensity, setIntensity] = useState<number>(0); // 0 = any

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of ALL_QUESTIONS) map.set(q.category, (map.get(q.category) ?? 0) + 1);
    return map;
  }, []);

  const start = (category: CategoryId | 'all') => {
    const custom = useProgress.getState().customQuestions;
    const recent = useProgress.getState().answered.slice(0, 120).map((a) => a.questionId);
    const deck = buildDeck({
      mode,
      category,
      maxIntensity: intensity === 0 ? undefined : intensity,
      count: 15,
      excludeIds: recent,
      customQuestions: custom,
    });
    useGame.getState().startSession({
      mode, kind: 'local', deck,
      players: [{ id: 'solo', name: '', avatar: 'fox' }],
    });
    navigation.navigate('Gameplay');
  };

  return (
    <Background>
      <Header title={t('category')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>{t('intensity')}</Text>
        <View style={styles.chipRow}>
          {[0, 2, 3, 4, 5].map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => setIntensity(lvl)}
              style={[styles.chip, intensity === lvl && styles.chipActive]}
            >
              <Text style={[styles.chipText, intensity === lvl && styles.chipTextActive]}>
                {lvl === 0 ? t('intensityAny') : '🔥'.repeat(Math.max(1, lvl - 1))}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: spacing.md }} />
        {CATEGORIES.map((c) => (
          <ModeCard
            key={c}
            emoji={c === 'all' ? '🌍' : MODES.find((m) => m.id === c)?.emoji ?? '❓'}
            title={c === 'all' ? t('allCategories') : t(`cat_${c}` as never)}
            subtitle={c === 'all' ? `${ALL_QUESTIONS.length}` : `${counts.get(c) ?? 0}`}
            onPress={() => start(c)}
          />
        ))}
      </ScrollView>
    </Background>
  );
}

export function PlayerSetupScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'PlayerSetup'>) {
  const { t } = useT();
  const { mode } = route.params;
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].key);
  const [rounds, setRounds] = useState(10);

  const addPlayer = () => {
    const trimmed = name.trim();
    if (!trimmed || players.length >= 12) return;
    setPlayers([...players, { id: `p${Date.now()}${players.length}`, name: trimmed, avatar }]);
    setName('');
    setAvatar(AVATARS[(players.length + 1) % AVATARS.length].key);
  };

  const start = () => {
    const finalPlayers = players.length > 0 ? players : [{ id: 'solo', name: '', avatar: 'fox' }];
    const custom = useProgress.getState().customQuestions;
    const recent = useProgress.getState().answered.slice(0, 120).map((a) => a.questionId);
    const deck = buildDeck({ mode, category: 'all', count: rounds, excludeIds: recent, customQuestions: custom });
    if (deck.length === 0) return;
    useGame.getState().startSession({ mode, kind: 'local', deck, players: finalPlayers });
    navigation.navigate('Gameplay');
  };

  return (
    <Background>
      <Header title={t('playerSetup')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {players.map((p, i) => (
          <View key={p.id} style={styles.playerRow}>
            <AvatarCircle avatar={p.avatar} />
            <Text style={styles.playerName}>{p.name}</Text>
            <Pressable onPress={() => setPlayers(players.filter((x) => x.id !== p.id))} hitSlop={8}>
              <Text style={{ color: colors.danger, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.sectionLabel}>{t('chooseAvatar')}</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((a) => (
            <Pressable key={a.key} onPress={() => setAvatar(a.key)}>
              <AvatarCircle avatar={a.key} size={52} active={avatar === a.key} />
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('playerName')}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={24}
            onSubmitEditing={addPlayer}
            returnKeyType="done"
          />
          <Pressable style={styles.addBtn} onPress={addPlayer}>
            <Text style={styles.addBtnText}>＋</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>{t('rounds')}</Text>
        <View style={styles.chipRow}>
          {[5, 10, 15, 20].map((n) => (
            <Pressable key={n} onPress={() => setRounds(n)} style={[styles.chip, rounds === n && styles.chipActive]}>
              <Text style={[styles.chipText, rounds === n && styles.chipTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />
        <PrimaryButton title={t('startGame')} onPress={start} />
        {players.length === 0 && (
          <Text style={styles.hint}>Solo play works too — add names for Pass & Play.</Text>
        )}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, ...typography.h1, textAlign: 'center', marginTop: spacing.xl },
  tagline: { color: colors.textSecondary, ...typography.body, textAlign: 'center', marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31%', flexGrow: 1, backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.borderSoft,
  },
  tileLabel: { color: colors.text, ...typography.caption, textAlign: 'center' },
  sectionLabel: { color: colors.textSecondary, ...typography.caption, marginBottom: spacing.sm, marginTop: spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft,
  },
  playerName: { flex: 1, color: colors.text, ...typography.bodyBold },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  input: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: 12, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border,
  },
  addBtn: {
    width: 48, borderRadius: radius.md, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, ...typography.caption },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  hint: { color: colors.textMuted, ...typography.caption, textAlign: 'center', marginTop: spacing.md },
});
