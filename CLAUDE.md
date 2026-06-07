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

Expo Router with three route groups:

- `/` (`app/index.tsx`) — auth landing page; navigates to `/(tabs)/map` (guest) or login/register
- `/(auth)/` — `login.tsx`, `register.tsx`; no tab bar
- `/(tabs)/` — main app: `map`, `recently`, `my-cats`, `settings`; `profile` is in this group but hidden from the tab bar (`href: null`)
- `/cats/` — `[id].tsx` (detail), `create.tsx` (new cat), `edit/[id].tsx` (edit); accessed as a stack from both the map and my-cats tab

### Data layer (`lib/`)

- **`lib/supabase.ts`** — single Supabase client; reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the environment (`.env` locally, EAS secrets for builds).
- **`lib/cats.ts`** — full CRUD against the `cats` table: `fetchAllCats`, `fetchCatById`, `createCat`, `updateCat`, `deleteCat`. `createCat` attempts to attach `auth.uid()` as owner but silently falls back to null.
- **`lib/auth.ts`** — thin wrappers over `supabase.auth`: `signUpWithEmail`, `signInWithEmail`, `signOut`, `onAuthStateChange`.

**Three cat data sources** — cat detail (`cats/[id].tsx`) resolves in this priority order:
1. AsyncStorage key `"myCats"` (locally created, not yet synced)
2. Supabase via `fetchCatById`
3. Bundled `data/cats.json` fallback

The `my-cats` and `recently` tabs fetch exclusively from Supabase (`fetchAllCats`). **Note:** `cats/create.tsx` has a stub `submit()` that only logs and navigates back — the actual `createCat` call is not yet wired up.

### Map (`app/(tabs)/map.tsx`)

Uses **`@rnmapbox/maps`** (native). The public access token (`pk.`) flows through `app.config.js` `extra.MAPBOX_ACCESS_TOKEN` → `expo-constants`. The downloads token (`sk.`) is only needed at EAS build time via the `@rnmapbox/maps` plugin. Tapping the map calls `onPress(GeoJSON.Feature)` and navigates to `/cats/create?lng=...&lat=...`. Cat markers are `Mapbox.MarkerView` components with a `Pressable` that navigates to the cat detail.

### Theme system

`context/theme.tsx` provides `ThemeContextProvider` wrapping the root layout. It stores user preference (`"system" | "light" | "dark"`) in AsyncStorage under `@theme_preference`. Components access it via `useThemeContext()` or the `useColorScheme` hook (`hooks/use-color-scheme.ts`). The palette is:

- Dark background: `#0f1720` / cards: `#1a2535`
- Accent: user-selectable (5 swatches: Navy `#1B5091`, Teal `#279D9F`, Amber `#FFA74F`, Pink `#E881A6`, Magenta `#CE3375`), persisted to AsyncStorage. Access via `useAccent()` from `context/theme.tsx`.
- Light background: `#fff`, primary: `#111827`
- **StyleSheet.create is static** — accent-colored styles must be applied as inline styles (`[styles.foo, { backgroundColor: accent }]`), not inside StyleSheet.

Themed primitives: `components/themed-text.tsx`, `components/themed-view.tsx`.

### Backend (Supabase)

Schema is in `supabase.sql`. The `cats` table has: `id` (uuid), `name`, `type`, `temperament`, `indoor` (bool), `notes`, `lat`, `lng`, `image` (text URL), `created_at`, `owner` (FK → `auth.users`).

RLS policies: public SELECT, authenticated INSERT, owner-only UPDATE/DELETE.

Image uploads use a Supabase Storage bucket named `cat-images` (must be created manually in the Supabase UI as public).

### Build config

- iOS bundle ID: `com.ryanspencer.cattinghour`
- Android package: `com.ryanspencer.cattinghour`
- EAS project ID: `b9efe0ad-f55f-499f-847a-2bc7ddba19c8`, owner: `rspencer1220`
- EAS profiles: `development` (dev client, internal), `preview` (internal), `production` (store)
