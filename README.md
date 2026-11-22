# Would You Rather — premium multiplayer mobile game

A bilingual (English + Arabic RTL) social party game: 523 original questions across 7
categories, pass-and-play local multiplayer, and real-time online rooms on Supabase.

## Tech

- Expo SDK 58 / React Native 0.88 / TypeScript
- React Navigation (native stack), zustand, AsyncStorage
- Supabase (Postgres + RLS + Realtime) for online rooms
- expo-audio, expo-haptics, expo-linear-gradient, expo-updates

## Structure

```
App.tsx                     entry
src/
  navigation/               stack navigator + route types
  screens/                  entry, menu, gameplay, online, secondary (24 screens)
  components/               design-system components
  theme/                    colors, gradients, typography, spacing
  i18n/                     en + ar dictionaries, RTL handling
  data/questions/           523 bilingual questions (7 category files)
  store/                    settings, progress, local game, online session (zustand)
  lib/                      question engine, rooms API, supabase client,
                            achievements, sounds, haptics, storage
supabase/schema.sql         tables, RLS, RPC functions (already applied)
.github/workflows/          free APK build on GitHub runners
```

## Configure

1. `cp .env.example .env` and fill in your Supabase project URL + publishable key.
2. Apply `supabase/schema.sql` once in the Supabase SQL editor (if not already applied).
3. Enable Realtime on the project (schema does this for the three tables).

## Run

```
npm install
npx expo start
```

## Build

- Android APK (free, no quota): GitHub → Actions → "Build Android APK" → Run workflow,
  then download the `would-you-rather.apk` artifact. Set repo variables
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` first
  (Settings → Secrets and variables → Actions → Variables).
- iOS IPA via EAS: `eas build -p ios --profile preview` (unsigned IPA sideloads with
  Sideloadly; a signed store build needs a paid Apple Developer account).
- Android via EAS: `eas build -p android --profile preview`.

## Online multiplayer model

No accounts needed. Rooms carry a 6-char code. The creating device gets a `host_token`;
each joining device stores a `player_token` (AsyncStorage) used for vote ownership and
reconnection. All writes go through security-definer RPCs; RLS allows read-only access
to room state. Duplicate votes are impossible (composite PK + ON CONFLICT DO NOTHING).
Rooms auto-expire after 6 hours and auto-close after the last round.
