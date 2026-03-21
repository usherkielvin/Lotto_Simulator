# Lotto Simulator — Frontend

A mobile-first lottery simulation app built with Expo + React Native, backed by a Spring Boot API. Simulates the full PCSO betting experience: pick numbers, place bets, track tickets, settle results, and manage your wallet — all with a polished UI and real-time data sync.

---

## Screenshots & Features

### Auth Screen
- Animated hero card with branded palette
- Login / Register toggle
- Demo mode (no account needed)
- Web-only theme toggle

### Home — Bet Builder
- Jackpot carousel with live amounts
- 9:00 PM draw countdown with auto-lock
- Balance tile with quick wallet access
- Game selector: 2D, 3D, 4D, 6D, and 6-number lotteries
- Manual pick + Lucky Pick modes

### Tickets
- Active pending bets with draw countdown
- Settled history with match-aware visual states (won / lost)
- Claim winnings flow

### Results
- Per-game official draw results
- Winner counts per draw slot

### Profile
- Player stats: total plays, win rate, best match, prizes won
- Lucky numbers (most frequently picked)
- Wallet quick actions
- Admin access shortcut

### Wallet
- Deposit and withdraw flows (min ₱50)
- Full funding transaction ledger

### Admin Panel _(admin role only)_
- Import official PCSO results via paste
- One-tap PCSO sync (triggers backend scraper)
- Result CRUD management

### Settings
- Theme: light / dark / system with persistent preference
- Notifications, privacy, help, and about screens
- Edit profile and change password
- Biometric authentication support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + Expo Router |
| UI | React Native 0.81 + React 19 |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based) + React Navigation |
| Animations | React Native Reanimated 4 + Gesture Handler |
| Tab Bar | `@callstack/liquid-glass` custom tab bar |
| Storage | AsyncStorage (session, theme) + SecureStore |
| Auth | Biometric (Face ID / Fingerprint) via expo-local-authentication |
| Offline | NetInfo connectivity detection with cached reads |
| Testing | Jest + ts-jest |
| Backend | Spring Boot 3.5 (sibling repo `../lotto`) |

---

## App Routes

```
app/
  index.tsx                  # Auth entry (login / register / demo)
  login.tsx                  # Login alias
  (tabs)/
    index.tsx                # Home — jackpot carousel + bet builder
    tickets.tsx              # Active bets + settled history
    results.tsx              # Official draw results
    profile.tsx              # Player stats + wallet actions
    admin.tsx                # Admin panel (role-gated)
  deposit.tsx                # Deposit flow
  withdraw.tsx               # Withdraw flow
  funding-history.tsx        # Transaction ledger
  payouts.tsx                # Payout rate reference
  edit-profile.tsx           # Edit display name + avatar
  change-password.tsx        # Password change
  settings-theme.tsx         # Theme switcher
  settings-notifications.tsx # Notification preferences
  settings-privacy.tsx       # Privacy settings
  settings-help.tsx          # Help & support
  about.tsx                  # App info
```

---

## API Integration

The app connects to the Spring Boot backend via environment variables:

```env
EXPO_PUBLIC_API_HOST=127.0.0.1
EXPO_PUBLIC_API_PORT=8099
```

Base URL resolves to: `http://<EXPO_PUBLIC_API_HOST>:<EXPO_PUBLIC_API_PORT>/api`

| Route Group | Endpoints Used |
|---|---|
| Auth | POST /auth/login, /auth/register, /auth/demo |
| Games | GET /games |
| Bets | POST /bets, GET /bets, /bets/history, /bets/unclaimed, POST /bets/claim |
| Wallet | GET/POST /bets/balance, GET /bets/funding |
| Profile | GET /profile |
| Admin | GET/POST/DELETE /admin/results, POST /admin/import-manual |

Session is stored via `useSession` hook. Protected requests send `X-User-Id` header.

---

## Local Setup

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Backend running at port 8099 (see `../lotto`)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create or edit `.env` in this folder:

```env
EXPO_PUBLIC_API_HOST=127.0.0.1
EXPO_PUBLIC_API_PORT=8099
```

> Android emulator: use `10.0.2.2` instead of `127.0.0.1`
> Physical device: use your machine's LAN IP

### 3) Start the app

```bash
npx expo start -c
```

Then press `a` for Android, `i` for iOS, or `w` for web.

---

## Scripts

| Command | Description |
|---|---|
| `npm run start` | Start Expo dev server |
| `npm run android` | Launch Android target |
| `npm run ios` | Launch iOS target |
| `npm run web` | Launch web target |
| `npm run lint` | Run Expo ESLint config |
| `npm run test` | Run Jest test suite |

---

## Project Structure

```
lottosimulator/
  app/              # Expo Router routes (auth, tabs, wallet, settings)
  components/       # Shared UI: LiquidGlassCard, GlassTabBar, ThemedText, etc.
  hooks/            # useApi, useSession, useBalance, usePalette, useConnectivity
  constants/        # Theme colors, API config
  assets/           # Icons, splash, images
  __tests__/        # Jest regression tests
```

---

## Theme System

- `theme-mode-store.ts` — persistent AsyncStorage-backed preference (light / dark / system)
- `use-color-scheme.ts` — reactive hook that drives tab bar, status bar, and all components
- `use-palette.ts` — maps active theme to a curated color set for consistent branding

---

## Related

Backend repo: [`../lotto`](../lotto/README.md) — Spring Boot 3.5, Java 21, MySQL
