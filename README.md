# Lotto Simulator

A full-stack lottery simulation app built with Expo, React Native, TypeScript, and a Spring Boot API.

It simulates a PCSO-style betting flow: pick numbers, place bets, track tickets, settle results, and manage wallet transactions with role-aware admin tools.

## Project Highlights

- Multi-game lotto simulator with daily and scheduled draw availability
- Real-time PCSO official data integration (jackpots, results, winners)
- 9:00 PM draw countdown and draw lock logic
- Manual pick + lucky pick betting modes
- Ticket tracking (active and settled history)
- Wallet actions: deposit, withdraw, and funding history
- Admin result management panel with **One-Tap PCSO Sync**
- Offline explore mode with cached read endpoints
- Theme Customization: unified light/dark/system mode switching with custom liquid-style tab UI

## Theme Setup

The app supports a full-application theme switching experience:

- **Store-Driven Theme Mode**: Centralized preference storage with persistent `AsyncStorage`.
- **Reactive Color Scheme**: Custom `useColorScheme` hook that ensures instant UI updates for the tab bar, status bar, and all styled components when the theme is toggled.
- **Dynamic Palette**: The `usePalette` hook maps the active theme to a curated set of colors for consistent branding across light and dark modes.

## Real-Time PCSO Data

Users can sync the simulator with live data from the [official PCSO website](https://www.pcso.gov.ph/searchlottoresult.aspx).

- **Sync Mechanism**: Admin users can trigger a backend sync that scrapes the latest draw results and jackpot amounts.
- **Auto-Settlement**: The app automatically compares user tickets against the real PCSO numbers to settle bets and award simulated winnings.

## UI Showcase

The app is designed as a polished mobile-first product UI (not a starter template):

- Auth screen: animated hero card, branded palette, signup/login switch, and web-only theme toggle
- Home dashboard: jackpot carousel, draw countdown, balance tile, and categorized game selector
- Bet builder: game-aware number picking for 2D, 3D, 4D, 6D, and 6-number lotteries
- My Bets: active tickets and results history with match-aware visual states
- Profile: player stats, lucky numbers, wallet quick actions, and admin access shortcut
- Wallet screens: dedicated deposit/withdraw flows plus funding ledger
- Navigation: custom blurred liquid tab bar with haptics and gesture interactions

## Tech Stack

Frontend (this repo):

- Expo SDK 54 + Expo Router
- React Native 0.81 + React 19
- TypeScript (strict mode)
- AsyncStorage + NetInfo for session/cache/offline support
- Jest for logic and regression tests

Backend (sibling repo in this workspace: ../lotto):

- Spring Boot 3.4.1 (Java 21)
- Spring Data JPA + MySQL
- Spring Security (BCrypt)

## App Routes

- / (auth entry)
- /login (alias to auth entry)
- /(tabs) (main app shell)
- /(tabs)/index (home / bet builder)
- /(tabs)/tickets (ticket center)
- /(tabs)/profile (profile and actions)
- /deposit
- /withdraw
- /funding-history
- /admin (admin role)

## API Snapshot

Base URL (frontend expects):

```txt
http://<EXPO_PUBLIC_API_HOST>:<EXPO_PUBLIC_API_PORT>/api
```

Main route groups:

- /api/auth (login, register, demo)
- /api/games (available lotto games)
- /api/bets (place bet, active bets, history, balance, funding)
- /api/profile (player summary)
- /api/admin/results (admin result CRUD)

## Local Setup

### 1) Start Backend (Spring Boot)

From ../lotto:

```bash
./mvnw spring-boot:run
```

On Windows PowerShell:

```powershell
.\mvnw spring-boot:run
```

Backend defaults:

- Port: 8099
- MySQL database: lottodb
- Schema seed file: src/main/resources/schema.sql

Before running first time, update DB credentials in:

- ../lotto/src/main/resources/application.properties

### 2) Start Frontend (Expo)

From this folder:

```bash
npm install
npx expo start -c
```

Optional env overrides (recommended):

```env
EXPO_PUBLIC_API_HOST=127.0.0.1
EXPO_PUBLIC_API_PORT=8099
```

Note:

- For Android emulator, host is commonly 10.0.2.2 instead of 127.0.0.1.
- For physical devices, use your machine LAN IP.

## Scripts

- npm run start - start Expo
- npm run android - run Android target
- npm run ios - run iOS target
- npm run web - run web target
- npm run lint - run Expo lint config
- npm run test - run Jest tests

## Testing

Frontend:

```bash
npm test
```

Backend:

```bash
cd ../lotto
./mvnw test
```

## Repository Structure

```txt
lottosimulator/
  app/                # Expo Router routes (auth, tabs, wallet, admin)
  components/         # Screen-level and shared UI components
  hooks/              # API, session, palette, connectivity helpers
  constants/          # Theme and API constants
  __tests__/          # Home-screen regression and preservation tests
```

## Status

Active development. Current focus is product-level UX polish, gameplay accuracy, and stable full-stack local workflows.
