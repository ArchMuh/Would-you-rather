import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, ActivityIndicator, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gradients, radius, spacing, typography, shadows } from '../theme';
import { hapticLight } from '../lib/haptics';
import { playSfx } from '../lib/sounds';
import { useT } from '../i18n';
import { avatarEmoji } from '../constants/avatars';

export function Background({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[...gradients.background]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const { isRTL } = useT();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.headerSide}>
          <Text style={styles.headerBack}>{isRTL ? '→' : '←'}</Text>
        </Pressable>
      ) : (
        <View style={styles.headerSide} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function PrimaryButton({
  title, onPress, variant = 'primary', disabled, loading, style,
}: {
  title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const inner = loading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={[styles.btnText, variant === 'ghost' && { color: colors.text }]}>{title}</Text>
  );
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => { hapticLight(); playSfx('tap'); onPress(); }}
      style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={disabled ? ['#3A3A4A', '#3A3A4A'] : [...gradients.primary]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.btn, !disabled && shadows.glow]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.btn, variant === 'ghost' && styles.btnGhost, variant === 'danger' && styles.btnDanger, disabled && { opacity: 0.5 }]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function AnswerCard({
  label, text, selected, revealed, pct, isMine, side, onPress, disabled,
}: {
  label: 'A' | 'B'; text: string; selected?: boolean; revealed?: boolean;
  pct?: number; isMine?: boolean; side: 'A' | 'B';
  onPress?: () => void; disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const idle: [string, string] = [side === 'A' ? colors.cardAIdle : colors.cardBIdle, side === 'A' ? colors.cardAIdle : colors.cardBIdle];
  const active: [string, string] = side === 'A' ? gradients.cardA : gradients.cardB;

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      >
        <LinearGradient
          colors={selected || revealed ? active : idle}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[
            styles.answerCard,
            selected && styles.answerSelected,
            revealed && isMine && styles.answerMine,
          ]}
        >
          <View style={styles.badgeRow}>
            <View style={styles.answerBadge}>
              <Text style={styles.answerBadgeText}>{label}</Text>
            </View>
          </View>
          <Text style={styles.answerText}>{text}</Text>
          {revealed && pct != null && (
            <View style={styles.pctRow}>
              <View style={styles.pctTrack}>
                <Animated.View style={[styles.pctFill, { width: `${Math.max(4, pct)}%` }]} />
              </View>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          )}
          {selected && !revealed && <Text style={styles.check}>✓</Text>}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export function AvatarCircle({ avatar, size = 44, active }: { avatar: string; size?: number; active?: boolean }) {
  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2 },
      active && { borderColor: colors.primary, borderWidth: 2 },
    ]}>
      <Text style={{ fontSize: size * 0.52 }}>{avatarEmoji(avatar)}</Text>
    </View>
  );
}

export function ModeCard({
  title, subtitle, emoji, locked, onPress,
}: { title: string; subtitle: string; emoji: string; locked?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.modeCard, pressed && { opacity: 0.85 }]}>
      <Text style={styles.modeEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeSub}>{subtitle}</Text>
      </View>
      {locked && <Text style={{ fontSize: 18 }}>🔒</Text>}
    </Pressable>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && { backgroundColor: colors.primary }]}>
        <View style={[styles.toggleThumb, value && { transform: [{ translateX: 20 }] }]} />
      </View>
    </Pressable>
  );
}

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translate]);
  return <Animated.View style={{ opacity, transform: [{ translateY: translate }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerSide: { width: 44, justifyContent: 'center' },
  headerBack: { fontSize: 26, color: colors.text },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.text, ...typography.h3 },
  btn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  btnDanger: { backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: colors.danger },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  answerCard: {
    borderRadius: radius.lg, padding: spacing.lg, minHeight: 96,
    justifyContent: 'flex-start', borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  answerSelected: { borderColor: '#fff', borderWidth: 2 },
  answerMine: { borderColor: colors.success, borderWidth: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  answerBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  answerBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  answerText: { color: colors.text, ...typography.bodyBold, textAlign: 'center' },
  check: { position: 'absolute', top: spacing.sm, end: spacing.md, color: '#fff', fontSize: 20, fontWeight: '800' },
  pctRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  pctTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  pctFill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  pctText: { color: '#fff', fontWeight: '800', fontSize: 15, minWidth: 44, textAlign: 'right' },
  avatar: { backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.borderSoft, marginBottom: spacing.sm,
  },
  modeEmoji: { fontSize: 28 },
  modeTitle: { color: colors.text, ...typography.bodyBold },
  modeSub: { color: colors.textSecondary, ...typography.caption, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  toggleLabel: { color: colors.text, ...typography.body },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, justifyContent: 'center', padding: 3 },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  statTile: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft,
  },
  statValue: { color: colors.text, ...typography.h2 },
  statLabel: { color: colors.textSecondary, ...typography.caption, marginTop: 4, textAlign: 'center' },
});
