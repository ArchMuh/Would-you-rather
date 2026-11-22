import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { Background, Header, PrimaryButton, AvatarCircle, ModeCard, AnswerCard, FadeIn } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import { useT, localize } from '../i18n';
import { useOnline } from '../store/online';
import { useProgress } from '../store/progress';
import { AVATARS } from '../constants/avatars';
import { createRoom, joinRoom, submitVote, hostAction, leaveRoom } from '../lib/rooms';
import { buildDeck, getQuestionById } from '../lib/questions';
import { playSfx } from '../lib/sounds';
import { hapticMedium, hapticSuccess } from '../lib/haptics';
import type { RootStackParamList } from '../navigation/types';
import type { GameModeId, VoteChoice } from '../types';

const ONLINE_MODES: { id: GameModeId; emoji: string }[] = [
  { id: 'classic', emoji: '🎲' },
  { id: 'friends', emoji: '🎉' },
  { id: 'couples', emoji: '💜' },
  { id: 'deep', emoji: '🌌' },
  { id: 'extreme', emoji: '🔥' },
  { id: 'funny', emoji: '😂' },
];

export function OnlineSetupScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'OnlineSetup'>) {
  const { t } = useT();
  const setSession = useOnline((s) => s.setSession);
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].key);
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<GameModeId>('classic');
  const [rounds, setRounds] = useState(10);
  const [busy, setBusy] = useState(false);

  const fail = (e: any) => {
    const msg = String(e?.message ?? 'error');
    Alert.alert(t('error'), t(msg as never) === String(msg) && ['roomNotFound', 'roomFull', 'roomClosed'].includes(msg) ? t(msg as never) : msg);
  };

  const doCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const custom = useProgress.getState().customQuestions;
      const deck = buildDeck({ mode, category: 'all', count: rounds, customQuestions: custom });
      const res = await createRoom({
        name: name.trim(), avatar, mode,
        questionIds: deck.map((q) => q.id), totalRounds: deck.length,
      });
      setSession({ roomId: res.roomId, playerId: res.playerId, hostToken: res.hostToken });
      navigation.replace('Lobby');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const doJoin = async () => {
    if (!name.trim() || code.trim().length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await joinRoom({ code, name: name.trim(), avatar });
      setSession({ roomId: res.roomId, playerId: res.playerId });
      navigation.replace('Lobby');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Background>
      <Header title={t('onlineGame')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === 'create' && styles.tabActive]} onPress={() => setTab('create')}>
            <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>{t('createRoom')}</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'join' && styles.tabActive]} onPress={() => setTab('join')}>
            <Text style={[styles.tabText, tab === 'join' && styles.tabTextActive]}>{t('joinRoom')}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{t('yourName')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('playerName')}
          placeholderTextColor={colors.textMuted}
          maxLength={24}
        />

        <Text style={styles.label}>{t('chooseAvatar')}</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((a) => (
            <Pressable key={a.key} onPress={() => setAvatar(a.key)}>
              <AvatarCircle avatar={a.key} size={48} active={avatar === a.key} />
            </Pressable>
          ))}
        </View>

        {tab === 'create' ? (
          <>
            <Text style={styles.label}>{t('gameModes')}</Text>
            <View style={styles.chipRow}>
              {ONLINE_MODES.map((m) => (
                <Pressable key={m.id} style={[styles.chip, mode === m.id && styles.chipActive]} onPress={() => setMode(m.id)}>
                  <Text style={[styles.chipText, mode === m.id && styles.chipTextActive]}>{m.emoji} {t(`mode_${m.id}` as never)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t('rounds')}</Text>
            <View style={styles.chipRow}>
              {[5, 10, 15, 20].map((n) => (
                <Pressable key={n} style={[styles.chip, rounds === n && styles.chipActive]} onPress={() => setRounds(n)}>
                  <Text style={[styles.chipText, rounds === n && styles.chipTextActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: spacing.lg }} />
            <PrimaryButton title={t('createRoom')} onPress={() => void doCreate()} loading={busy} disabled={!name.trim()} />
          </>
        ) : (
          <>
            <Text style={styles.label}>{t('enterRoomCode')}</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            <View style={{ height: spacing.lg }} />
            <PrimaryButton title={t('joinRoom')} onPress={() => void doJoin()} loading={busy} disabled={!name.trim() || code.length !== 6} />
          </>
        )}
      </ScrollView>
    </Background>
  );
}

export function LobbyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Lobby'>) {
  const { t } = useT();
  const { snapshot, hostToken, playerId, attach, clear } = useOnline();

  useEffect(() => {
    const detach = attach();
    return detach;
  }, [attach]);

  useEffect(() => {
    if (snapshot?.room.status === 'playing') navigation.replace('OnlineGame');
    if (snapshot?.room.status === 'closed') {
      clear();
      navigation.popToTop();
    }
  }, [snapshot?.room.status, navigation, clear]);

  const room = snapshot?.room;
  const players = snapshot?.players ?? [];
  const isHost = Boolean(hostToken);

  const start = async () => {
    if (!room || !hostToken) return;
    try {
      await hostAction(room.id, hostToken, 'start');
    } catch (e: any) {
      Alert.alert(t('error'), e?.message);
    }
  };

  const leave = async () => {
    if (room && playerId) await leaveRoom(room.id, playerId);
    clear();
    navigation.popToTop();
  };

  return (
    <Background>
      <Header title={t('lobby')} onBack={() => void leave()} />
      <View style={styles.container}>
        {room && (
          <FadeIn>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>{t('roomCode')}</Text>
              <Text style={styles.codeText}>{room.code}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Pressable
                  onPress={() => {
                    void Clipboard.setStringAsync(room.code);
                    Alert.alert(t('copiedCode'));
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.codeAction}>📋 {t('copiedCode').split(' ')[0]}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void Share.share({ message: `Join my Would You Rather room: ${room.code}` }).catch(() => {})}
                  hitSlop={8}
                >
                  <Text style={styles.codeAction}>📤 {t('shareCode')}</Text>
                </Pressable>
              </View>
            </View>
          </FadeIn>
        )}

        <Text style={styles.label}>{t('players')} · {players.length}</Text>
        <ScrollView style={{ flex: 1 }}>
          {players.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <AvatarCircle avatar={p.avatar} size={40} />
              <Text style={styles.playerName}>
                {p.name} {p.id === playerId ? '·' : ''}
              </Text>
              {p.isHost && <Text>👑</Text>}
              {!p.connected && <Text style={{ color: colors.textMuted }}>⚡</Text>}
            </View>
          ))}
        </ScrollView>

        {isHost ? (
          <PrimaryButton title={t('startRound')} onPress={() => void start()} disabled={players.length < 1} />
        ) : (
          <Text style={styles.waiting}>{t('waitingForHost')}</Text>
        )}
      </View>
    </Background>
  );
}

export function OnlineGameScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'OnlineGame'>) {
  const { t, language } = useT();
  const { snapshot, hostToken, playerId, attach, clear } = useOnline();
  const progress = useProgress();
  const [selected, setSelected] = useState<VoteChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const detach = attach();
    return detach;
  }, [attach]);

  const room = snapshot?.room;
  const players = snapshot?.players ?? [];
  const votes = snapshot?.votes ?? [];

  const question = useMemo(() => {
    if (!room) return undefined;
    return getQuestionById(room.questionIds[room.currentRound], progress.customQuestions);
  }, [room, progress.customQuestions]);

  useEffect(() => {
    setSelected(null);
  }, [room?.currentRound]);

  useEffect(() => {
    if (room?.status === 'closed') {
      clear();
      navigation.popToTop();
    }
  }, [room?.status, navigation, clear]);

  if (!room || !question) {
    return (
      <Background>
        <View style={styles.center}><Text style={styles.waiting}>{t('loading')}</Text></View>
      </Background>
    );
  }

  const roundVotes = votes.filter((v) => v.round === room.currentRound);
  const myVote = roundVotes.find((v) => v.playerId === playerId)?.choice ?? selected;
  const activePlayers = players.filter((p) => p.connected);
  const allVoted = activePlayers.length > 0 && activePlayers.every((p) => roundVotes.some((v) => v.playerId === p.id));
  const revealed = !room.votingOpen || allVoted;
  const aVotes = roundVotes.filter((v) => v.choice === 'A').length;
  const pctA = roundVotes.length ? Math.round((aVotes / roundVotes.length) * 100) : 0;
  const pctB = 100 - pctA;
  const majority: VoteChoice | null = aVotes === pctB ? null : aVotes * 2 > roundVotes.length ? 'A' : 'B';
  const isLast = room.currentRound + 1 >= room.totalRounds;

  const vote = async (choice: VoteChoice) => {
    if (myVote || submitting || !room.votingOpen || !playerId) return;
    setSelected(choice);
    setSubmitting(true);
    hapticMedium();
    playSfx('select');
    try {
      await submitVote({ roomId: room.id, playerId, round: room.currentRound, choice });
      progress.recordAnswer({
        questionId: question.id, choice, majorityChoice: null,
        mode: room.mode, at: Date.now(), timeToAnswerMs: 0,
      });
    } catch {
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  const doHost = async (action: 'end_voting' | 'next_round' | 'close') => {
    if (!hostToken) return;
    try {
      await hostAction(room.id, hostToken, action);
      if (action === 'next_round') playSfx('whoosh');
      if (action === 'end_voting') { playSfx('reveal'); hapticSuccess(); }
    } catch {
      // realtime refresh will reconcile state
    }
  };

  // Auto-reveal for everyone once all connected players voted.
  useEffect(() => {
    if (allVoted && room.votingOpen && hostToken) void doHost('end_voting');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVoted, room.votingOpen]);

  return (
    <Background>
      <Header title={t('questionOf', { current: room.currentRound + 1, total: room.totalRounds })} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.playersStrip}>
          {players.map((p) => {
            const voted = roundVotes.some((v) => v.playerId === p.id);
            return (
              <View key={p.id} style={{ alignItems: 'center' }}>
                <AvatarCircle avatar={p.avatar} size={36} active={voted} />
                <Text style={styles.stripName} numberOfLines={1}>{p.name}</Text>
                <Text style={{ fontSize: 10 }}>{revealed ? (roundVotes.find((v) => v.playerId === p.id)?.choice === 'A' ? '🅰️' : '🅱️') : voted ? '✅' : '⏳'}</Text>
              </View>
            );
          })}
        </View>

        <FadeIn key={question.id}>
          <Text style={styles.wyr}>{t('wouldYouRather')}</Text>
          <View style={{ height: spacing.md }} />
          <AnswerCard label="A" side="A" text={localize(question.optionA, language)}
            selected={myVote === 'A'} revealed={revealed} pct={revealed ? pctA : undefined}
            isMine={revealed && myVote === 'A'} disabled={Boolean(myVote) || revealed}
            onPress={() => void vote('A')} />
          <View style={styles.orRow}>
            <View style={styles.orLine} /><Text style={styles.orText}>{t('or')}</Text><View style={styles.orLine} />
          </View>
          <AnswerCard label="B" side="B" text={localize(question.optionB, language)}
            selected={myVote === 'B'} revealed={revealed} pct={revealed ? pctB : undefined}
            isMine={revealed && myVote === 'B'} disabled={Boolean(myVote) || revealed}
            onPress={() => void vote('B')} />
        </FadeIn>

        {myVote && !revealed && <Text style={styles.waiting}>{t('waitingForOthers')}</Text>}

        {revealed && (
          <FadeIn>
            <Text style={styles.revealTitle}>
              {majority == null ? t('split') : myVote ? (majority === myVote ? t('majorityAgrees') : t('againstMajority')) : t('results')}
            </Text>
            <View style={{ height: spacing.md }} />
            {hostToken ? (
              <PrimaryButton
                title={isLast ? t('endGame') : t('nextQuestion')}
                onPress={() => void doHost(isLast ? 'close' : 'next_round')}
              />
            ) : (
              <Text style={styles.waiting}>{t('waitingForHost')}</Text>
            )}
          </FadeIn>
        )}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bgCard, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, ...typography.bodyBold },
  tabTextActive: { color: '#fff' },
  label: { color: colors.textSecondary, ...typography.caption, marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: 12, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border,
  },
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: '800' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, ...typography.caption },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  codeBox: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  codeLabel: { color: colors.textSecondary, ...typography.caption },
  codeText: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: 6, marginVertical: spacing.sm },
  codeAction: { color: colors.primary, ...typography.caption },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft,
  },
  playerName: { flex: 1, color: colors.text, ...typography.bodyBold },
  waiting: { color: colors.textSecondary, ...typography.body, textAlign: 'center', marginVertical: spacing.md },
  playersStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginBottom: spacing.md },
  stripName: { color: colors.textMuted, fontSize: 10, maxWidth: 56 },
  wyr: { color: colors.textSecondary, ...typography.h3, textAlign: 'center' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, ...typography.bodyBold, marginHorizontal: spacing.md },
  revealTitle: { color: colors.text, ...typography.h3, textAlign: 'center', marginTop: spacing.lg },
});
