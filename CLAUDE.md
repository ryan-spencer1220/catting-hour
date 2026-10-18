# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server (choose platform interactively)
npx expo start

# Platform-specific
npx expo start --ios
npx expo start --android
npx expo start --web

# Lint
npm run lint

# EAS builds
eas build --profile development
eas build --profile preview
eas build --profile production
```

```bash
# Run tests
npx jest
npx jest --testPathPattern=achievements  # single file
```

## Architecture

**catting-hour** is an Expo (React Native) app for sharing and discovering local cats. Stack: Expo SDK 54, Expo Router v6 (file-based routing), Supabase (Postgres + Auth + Storage), React 19, TypeScript, New Architecture enabled.

### Routing

Expo Router. The root stack (`app/_layout.tsx`) holds:

- `/` (`app/index.tsx`): onboarding slides on first launch (tracked in AsyncStorage under `@onboarding_seen`), then the auth landing page
- `/(auth)/`: `login`, `register`, `forgot-password`, `reset-password`; no tab bar
- `/(tabs)/`: the main app, rendered with the custom `FloatingTabBar`. Visible tabs are `map`, `nearby`, `feed`, `my-cats` (titled "Profile"), and `settings`. `profile` is a redirect hidden from the tab bar (`href: null`)
- `/cats/`: `[id]` (detail), `create` (new cat, opened from a map tap with `lng`/`lat` params), `edit/[id]`
- `/users/[id]`: another user's profile with follow button and their cats
- `/my-logged-cats`, `/privacy`, `/terms`

### Data layer (`lib/`)

All cat data comes from Supabase; there is no local or bundled fallback.

- **`supabase.ts`**: single Supabase client; reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`.env` locally, EAS secrets for builds).
- **`cats.ts`**: CRUD on `cats` (`fetchAllCats`, `fetchFollowingCats`, `fetchCatById`, `createCat`, `updateCat`, `deleteCat`), `suggestCatName` (RPC `suggest_cat_name`), and `uploadImage` to the `cat-images` bucket (10 MB limit).
- **`photos.ts`**: multiple photos per cat via the `cat_photos` table.
- **`checkins.ts`**: comments/sightings on a cat (`checkins` table).
- **`likes.ts`**: likes (`cat_likes` table).
- **`profiles.ts`**: profiles, follow/unfollow, follower counts (`profiles`, `follows`).
- **`achievements.ts`**: achievement definitions and unlock checks (cats added, followers, states, countries); unlocked IDs persist in AsyncStorage.
- **`notifications.ts`**: push notification opt-in via `expo-notifications` (skipped in Expo Go).
- **`distance.ts`**: haversine distance, unit formatting, and radius conversion for the Nearby tab.
- **`auth.ts`**: thin wrappers over `supabase.auth`.
- **`cat-names.ts`**: random placeholder names for cats whose real name is unknown.

### Map (`app/(tabs)/map.tsx`)

Uses **`@rnmapbox/maps`** (native, so Expo Go shows a fallback screen). The public access token (`pk.`) flows through `app.config.js` `extra.MAPBOX_ACCESS_TOKEN` to `expo-constants`. The downloads token (`sk.`) is only needed at build time via the `@rnmapbox/maps` plugin. Cats render as a clustered `ShapeSource` with circle and symbol layers (a paw icon is rasterized into an SDF image). Tapping a cluster zooms in; tapping a cat opens a swipeable preview card; tapping empty map navigates to `/cats/create?lng=...&lat=...`.

### Accessibility conventions

The map's pins are not reachable by screen readers, so the Nearby and Feed tabs are the accessible way to browse cats. When adding UI:

- Every `Pressable`/`TouchableOpacity` gets an `accessibilityRole`. Icon-only buttons (back, close, delete) also need an `accessibilityLabel`.
- Text inputs get an `accessibilityLabel`, since placeholders disappear once the user types.
- Segmented controls use `radiogroup`/`radio` with `accessibilityState={{ checked }}`; tab-like switchers use `tablist`/`tab` with `selected`.
- Long-press actions (delete photo, delete comment) must also be exposed through `accessibilityActions`.
- Decorative icons and placeholder art are hidden with `importantForAccessibility="no-hide-descendants"` and `accessibilityElementsHidden`.
- `FadeImage` and `SelectField` take `accessibilityLabel` / `label` props; pass them.
- Tests for these live in `__tests__/accessibility.test.tsx`. React Native Testing Library v14 needs `await render(...)`.

### Theme system

`context/theme.tsx` provides `ThemeContextProvider` wrapping the root layout. It stores user preference (`"system" | "light" | "dark"`) in AsyncStorage under `@theme_preference`. Components access it via `useThemeContext()` or the `useColorScheme` hook (`hooks/use-color-scheme.ts`). The palette is:

- Dark background: `#0f1720` / cards: `#1a2535`
- Accent: user-selectable (5 swatches: Navy `#1B5091`, Teal `#279D9F`, Amber `#FFA74F`, Pink `#E881A6`, Magenta `#CE3375`), persisted to AsyncStorage. Access via `useAccent()` from `context/theme.tsx`.
- Light background: `#fff`, primary: `#111827`
- **StyleSheet.create is static** — accent-colored styles must be applied as inline styles (`[styles.foo, { backgroundColor: accent }]`), not inside StyleSheet.

Themed primitives: `components/themed-text.tsx`, `components/themed-view.tsx`.

### Backend (Supabase)

Schema is in `supabase.sql`, with tables `cats`, `profiles`, `follows`, `checkins`, `cat_likes`, and `cat_photos`, all protected by row level security. For `cats`: public SELECT, authenticated INSERT, owner-only UPDATE/DELETE.

The `delete-account` Edge Function (`supabase/functions/delete-account`) handles in-app account deletion.

Image uploads use a Supabase Storage bucket named `cat-images` (must be created manually in the Supabase UI as public).

### Build config

- iOS bundle ID: `com.ryanspencer.cattinghour`
- Android package: `com.ryanspencer.cattinghour`
- EAS project ID: `b9efe0ad-f55f-499f-847a-2bc7ddba19c8`, owner: `rspencer1220`
- EAS profiles: `development` (dev client, internal), `preview` (internal), `production` (store)
