import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import type { RootStackParamList } from './types';
import { SplashScreen, LanguageSelectionScreen, OnboardingScreen, AgeGateScreen } from '../screens/entry';
import { MainMenuScreen, ModeSelectionScreen, CategorySelectionScreen, PlayerSetupScreen } from '../screens/menu';
import { GameplayScreen, GameOverScreen } from '../screens/gameplay';
import { OnlineSetupScreen, LobbyScreen, OnlineGameScreen } from '../screens/online';
import {
  StatsScreen, LeaderboardScreen, AchievementsScreen, FavoritesScreen,
  HistoryScreen, CustomQuestionsScreen, DailyScreen, SettingsScreen,
} from '../screens/secondary';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainMenuScreen} />
        <Stack.Screen name="Modes" component={ModeSelectionScreen} />
        <Stack.Screen name="Categories" component={CategorySelectionScreen} />
        <Stack.Screen name="PlayerSetup" component={PlayerSetupScreen} />
        <Stack.Screen name="Gameplay" component={GameplayScreen} />
        <Stack.Screen name="GameOver" component={GameOverScreen} />
        <Stack.Screen name="OnlineSetup" component={OnlineSetupScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="OnlineGame" component={OnlineGameScreen} />
        <Stack.Screen name="Daily" component={DailyScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="CustomQuestions" component={CustomQuestionsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AgeGate" component={AgeGateScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
