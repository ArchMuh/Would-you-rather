import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Share, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Background, Header, PrimaryButton, AnswerCard, FadeIn, AvatarCircle } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import { useT, localize } from '../i18n';
import { useGame } from '../store/game';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { playSfx } from '../lib/sounds';
import { hapticMedium, hapticSuccess } from '../lib/haptics';
import { computeMatches, verdictTier } from '../lib/matchmaking';
import { evaluateAchievements } from '../lib/achievements';
import type { RootStackParamList } from '../navigation/types';
import type { VoteChoice } from '../types';

export function GameplayScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Gameplay'>) {
  const { t, language } = useT();
  const game = useGame();
  const progress = useProgress();
  const [selected, setSelected] = useState<VoteChoice | null>(null);

  const question = game.deck[game.index];
  const currentPlayer = game.players[game.currentPlayerIdx];
  const isLast = game.index + 1 >= game.deck.length;

  useEffect(() => {
    if (!question) navigation.replace('Main');
  }, [question, navigation]);

  useEffect(() => {
    setSelected(null);
  }, [game.index, game.currentPlayerIdx]);

  if (!question) return null;

  const isFav = progress.favorites.includes(question.id);

  const recordRound = (votes: { playerId: string; choice: VoteChoice }[]) => {
    const aCount = votes.filter((v) => v.choice === 'A').length;
    const bCount = votes.length - aCount;
    const majority: VoteChoice | null = aCount === bCount ? null : aCount > bCount ? 'A' : 'B';
    const now = Date.now();
    // Record this device's perspective: every local player's answer counts.
    for (const v of votes) {
      progress.recordAnswer({
        questionId: question.id,
        choice: v.choice,
        majorityChoice: majority,
        mode: game.mode,
        at: now,
        timeToAnswerMs: now - game.shownAt,
      });
    }
    const answered = useProgress.getState().answered;
    const newly = evaluateAchievements({
      answered,
      favoritesCount: progress.favorites.length,
      customCount: progress.customQuestions.length,
      dailyStreak: progress.daily.streak,
      distinctPlayers: new Set(answered.map((a) => a.questionId)).size > 0 ? game.players.length : 0,
      hostedGames: 0,
      roundsWithoutSkip: answered.length - game.skips,
    });
    newly.forEach((id) => progress.unlockAchievement(id));
  };

  const castVote = (choice: VoteChoice) => {
    if (game.phase !== 'vote') return;
    setSelected(choice);
    hapticMedium();
    playSfx('select');
    const votesAfter = [...game.votes, { playerId: currentPlayer.id, choice, answeredAt: Date.now() }];
    setTimeout(() => {
      game.castVote(choice);
      if (votesAfter.length >= game.players.length) {
        recordRound(votesAfter);
        playSfx('reveal');
        hapticSuccess();
      }
    }, 350);
  };

  const next = () => {
    playSfx('whoosh');
    if (isLast) {
      game.archiveRound();
      progress.recordGame({
        id: `g${Date.now()}`,
        mode: game.mode,
        kind: 'local',
        players: game.players.map((p) => p.name).filter(Boolean),
        rounds: game.deck.length,
        at: Date.now(),
      });
      navigation.replace('GameOver');
    } else {
      game.next();
    }
  };

  const aVotes = game.votes.filter((v) => v.choice === 'A').length;
  const bVotes = game.votes.length - aVotes;
  const pctA = game.votes.length ? Math.round((aVotes / game.votes.length) * 100) : 0;
  const pctB = 100 - pctA;
  const myChoice = game.solo ? game.votes[0]?.choice : undefined;
  const majority: VoteChoice | null = aVotes === bVotes ? null : aVotes > bVotes ? 'A' : 'B';

  const shareResult = async () => {
    const text = `Would you rather…\nA: ${question.optionA.en}\nB: ${question.optionB.en}\n\n${pctA}% chose A · ${pctB}% chose B`;
    await Share.share({ message: text }).catch(() => {});
  };

  // ── Pass-the-phone interstitial ──
  if (game.phase === 'pass' && currentPlayer) {
    return (
      <Background>
        <View style={styles.center}>
          <FadeIn key={currentPlayer.id}>
            <AvatarCircle avatar={currentPlayer.avatar} size={88} />
            <Text style={styles.h2}>{t('passTo', { name: currentPlayer.name })}</Text>
            <Text style={styles.body}>{t('passBody')}</Text>
          </FadeIn>
        </View>
        <View style={{ padding: spacing.lg }}>
          <PrimaryButton title={t('imReady')} onPress={() => { playSfx('whoosh'); game.beginTurn(); }} />
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <Header
        title={t('questionOf', { current: game.index + 1, total: game.deck.length })}
        onBack={() =>
          Alert.alert(t('endGame'), '', [
            { text: t('cancel'), style: 'cancel' },
            { text: t('confirm'), onPress: () => { game.reset(); navigation.popToTop(); } },
          ])
        }
        right={
          <Pressable
            hitSlop={12}
            onPress={() => {
              progress.toggleFavorite(question.id);
              playSfx('tap');
            }}
          >
            <Text style={{ fontSize: 22 }}>{isFav ? '❤️' : '🤍'}</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.metaRow}>
          <View style={styles.catChip}>
            <Text style={styles.catChipText}>{t(`cat_${question.category}` as never)}</Text>
          </View>
          <Text style={styles.intensity}>{'🔥'.repeat(question.intensity)}</Text>
        </View>

        <FadeIn key={question.id}>
          <Text style={styles.wyr}>{t('wouldYouRather')}</Text>

          <View style={{ height: spacing.lg }} />
          <AnswerCard
            label="A" side="A"
            text={localize(question.optionA, language)}
            selected={selected === 'A'}
            revealed={game.phase === 'reveal'}
            pct={game.phase === 'reveal' ? pctA : undefined}
            isMine={game.phase === 'reveal' && myChoice === 'A'}
            disabled={game.phase === 'reveal'}
            onPress={() => castVote('A')}
          />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>{t('or')}</Text>
            <View style={styles.orLine} />
          </View>

          <AnswerCard
            label="B" side="B"
            text={localize(question.optionB, language)}
            selected={selected === 'B'}
            revealed={game.phase === 'reveal'}
            pct={game.phase === 'reveal' ? pctB : undefined}
            isMine={game.phase === 'reveal' && myChoice === 'B'}
            disabled={game.phase === 'reveal'}
            onPress={() => castVote('B')}
          />
        </FadeIn>

        {game.phase === 'reveal' && (
          <FadeIn>
            <View style={styles.revealBox}>
              <Text style={styles.revealTitle}>
                {majority == null
                  ? t('split')
                  : myChoice
                    ? majority === myChoice ? t('majorityAgrees') : t('againstMajority')
                    : t('results')}
              </Text>
              {!game.solo && (
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  {game.players.map((p) => {
                    const v = game.votes.find((x) => x.playerId === p.id);
                    return (
                      <View key={p.id} style={styles.playerVoteRow}>
                        <AvatarCircle avatar={p.avatar} size={30} />
                        <Text style={styles.playerVoteName}>{p.name}</Text>
                        <Text style={[styles.playerVoteChoice, { color: v?.choice === 'A' ? colors.primary : colors.accent }]}>
                          {v?.choice === 'A' ? 'A' : 'B'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ height: spacing.md }} />
            <PrimaryButton title={isLast ? t('endGame') : t('nextQuestion')} onPress={next} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton title={t('shareResult')} variant="ghost" onPress={() => void shareResult()} />
          </FadeIn>
        )}

        {game.phase === 'vote' && (
          <View style={styles.actionRow}>
            <Pressable onPress={() => { playSfx('tap'); game.skipQuestion(); }} hitSlop={8}>
              <Text style={styles.actionText}>⏭ {t('skipQuestion')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                progress.reportQuestion(question.id);
                Alert.alert(t('reportThanks'));
              }}
              hitSlop={8}
            >
              <Text style={styles.actionText}>🚩 {t('report')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

export function GameOverScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'GameOver'>) {
  const { t } = useT();
  const game = useGame();
  const progress = useProgress();
  const total = progress.answered.length;
  const withMaj = progress.answered.filter((a) => a.majorityChoice != null && a.majorityChoice === a.choice).length;

  const matches = useMemo(
    () => computeMatches(game.players, game.history),
    [game.players, game.history],
  );
  const showMatches = game.kind === 'local' && game.players.filter((p) => p.name.trim()).length >= 2;

  return (
    <Background>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.center}>
          <FadeIn>
            <Text style={{ fontSize: 72, textAlign: 'center' }}>🎉</Text>
            <Text style={styles.h2}>{t('gameOver')}</Text>
            <Text style={styles.body}>
              {t('questionsAnswered')}: {total} · {t('timesWithMajority')}: {withMaj}
            </Text>
          </FadeIn>

          {showMatches && (
            <FadeIn>
              <View style={styles.matchCard}>
                <Text style={styles.matchTitle}>💘 {t('matchResults')}</Text>
                {matches.best ? (
                  <>
                    <View style={styles.matchBestRow}>
                      <AvatarCircle avatar={matches.best.a.avatar} size={44} />
                      <Text style={styles.matchNames}>
                        {matches.best.a.name} & {matches.best.b.name}
                      </Text>
                      <AvatarCircle avatar={matches.best.b.avatar} size={44} />
                    </View>
                    <Text style={styles.matchPct}>{matches.best.pct}%</Text>
                    <Text style={styles.matchLine}>
                      {t('matchSameLine', { same: matches.best.same, total: matches.best.total })}
                    </Text>
                    <Text style={styles.matchVerdict}>
                      {t(`matchVerdict${verdictTier(matches.best.pct) === 'perfect' ? 'Perfect' : verdictTier(matches.best.pct) === 'great' ? 'Great' : verdictTier(matches.best.pct) === 'sparks' ? 'Sparks' : 'Opposites'}` as never)}
                    </Text>
                    {matches.pairs.slice(1).map((m) => (
                      <Text key={`${m.a.id}-${m.b.id}`} style={styles.matchPairRow}>
                        {m.a.name} + {m.b.name} · {m.pct}%
                      </Text>
                    ))}
                    {matches.oddOneOut && (
                      <Text style={styles.matchOdd}>
                        {t('matchOddOneOut', { name: matches.oddOneOut.player.name })}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.matchLine}>{t('matchNoData')}</Text>
                )}
              </View>
            </FadeIn>
          )}
        </View>
      </ScrollView>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <PrimaryButton title={t('playAgain')} onPress={() => { game.reset(); navigation.replace('Modes'); }} />
        <PrimaryButton title={t('backToMenu')} variant="ghost" onPress={() => { game.reset(); navigation.popToTop(); }} />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  h2: { color: colors.text, ...typography.h2, textAlign: 'center', marginTop: spacing.lg },
  body: { color: colors.textSecondary, ...typography.body, textAlign: 'center', marginTop: spacing.md },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
  catChip: { backgroundColor: colors.bgCard, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  catChipText: { color: colors.primary, ...typography.caption, fontWeight: '700' },
  intensity: { fontSize: 12 },
  wyr: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, ...typography.bodyBold, marginHorizontal: spacing.md },
  revealBox: {
    marginTop: spacing.lg, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  revealTitle: { color: colors.text, ...typography.h3, textAlign: 'center' },
  playerVoteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  playerVoteName: { flex: 1, color: colors.text, ...typography.body },
  playerVoteChoice: { ...typography.bodyBold, fontSize: 18 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.xl },
  actionText: { color: colors.textSecondary, ...typography.caption },
  matchCard: {
    marginTop: spacing.xl, alignSelf: 'stretch', backgroundColor: colors.bgCard,
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  matchTitle: { color: colors.text, ...typography.h3, marginBottom: spacing.md },
  matchBestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  matchNames: { color: colors.text, ...typography.bodyBold, marginHorizontal: spacing.sm },
  matchPct: { color: colors.primary, fontSize: 44, fontWeight: '900', marginTop: spacing.sm },
  matchLine: { color: colors.textSecondary, ...typography.caption, marginTop: 4, textAlign: 'center' },
  matchVerdict: { color: colors.text, ...typography.bodyBold, marginTop: spacing.sm, textAlign: 'center' },
  matchPairRow: { color: colors.textSecondary, ...typography.body, marginTop: spacing.xs },
  matchOdd: { color: colors.textMuted, ...typography.caption, marginTop: spacing.md, textAlign: 'center' },
});
