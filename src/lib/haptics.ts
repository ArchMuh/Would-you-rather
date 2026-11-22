import * as Haptics from 'expo-haptics';
import { useSettings } from '../store/settings';

export function hapticLight() {
  if (!useSettings.getState().haptics) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium() {
  if (!useSettings.getState().haptics) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticSuccess() {
  if (!useSettings.getState().haptics) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
