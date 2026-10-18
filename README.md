# The Catting Hour

The Catting Hour is a social iOS app for spotting and sharing neighborhood cats. Drop a pin where you met a cat, add photos and details, and follow other cat spotters to see who they've found.

## Features

- **Map:** browse cats on a Mapbox map, and tap anywhere to log a new cat at that spot.
- **Nearby:** see cats within an adjustable radius of your current location, in miles or kilometers.
- **Feed:** recent cats from everyone, or only from people you follow.
- **Cat profiles:** photos, type, temperament, indoor or outdoor, and notes. Other users can check in when they see the same cat, like it, and suggest names for cats nobody has named yet.
- **Social:** user profiles with followers and following.
- **Achievements:** unlocked for cats logged, followers gained, and cats spotted across states and countries.
- **Push notifications** through Expo Notifications.
- **Themes:** light and dark modes with selectable accent colors.

## Tech stack

- [Expo](https://expo.dev) SDK 54, React Native 0.81, React 19, and TypeScript
- Expo Router for file-based navigation
- Mapbox maps through [`@rnmapbox/maps`](https://github.com/rnmapbox/maps)
- [Supabase](https://supabase.com) for Postgres with row level security, authentication, image storage, and an Edge Function for account deletion
- Jest and React Native Testing Library
- GitHub Actions CI that type checks, lints, and runs tests on every push and pull request
- EAS Build for development, preview, and production builds

## Getting started

### Prerequisites

- Node.js 24
- Xcode with an iOS Simulator
- A Supabase project
- A Mapbox account with a public access token and a downloads token

The Mapbox SDK is a native module, so the app runs as a development build rather than in Expo Go.

### Setup

1. Clone and install:

   ```bash
   git clone https://github.com/ryan-spencer1220/catting-hour.git
   cd catting-hour
   npm install --legacy-peer-deps
   ```

2. Copy the example environment file and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `EXPO_PUBLIC_SUPABASE_URL` | Supabase project settings, API |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings, API |
   | `MAPBOX_ACCESS_TOKEN` | Mapbox public token (`pk.`) |
   | `MAPBOX_DOWNLOADS_TOKEN` | Mapbox secret token with downloads scope (`sk.`), used at build time |

3. Set up Supabase:
   - Run `supabase.sql` in the Supabase SQL editor to create the tables and row level security policies.
   - In Storage, create a public bucket named `cat-images`.
   - Deploy the account deletion function: `supabase functions deploy delete-account`

4. Build and run on the iOS Simulator:

   ```bash
   npx expo run:ios
   ```

### Tests and checks

```bash
npm test           # Jest unit tests
npm run typecheck  # TypeScript
npm run lint       # ESLint
```

## Project structure

```
app/          Screens and routes (Expo Router)
  (tabs)/     Map, Nearby, Feed, Profile, Settings
  cats/       Cat detail, create, and edit screens
  (auth)/     Sign in, registration, and password reset
components/   Shared UI components
lib/          Supabase data access, achievements, distance math, notifications
supabase/     Edge Functions
__tests__/    Unit tests
```
