# Metronut Mobile

Expo iOS app shell for Metronut. This app is intentionally kept outside the root Vercel build path so mobile development does not change the deployed web bundle.

## Commands

From the repository root:

```bash
pnpm mobile:install
pnpm mobile:start
pnpm mobile:ios
```

Or from this directory:

```bash
pnpm install
pnpm start
pnpm ios
```

## Environment

Copy `.env.example` to `.env.local` and point the mobile app at the deployed API.

```bash
cp .env.example .env.local
```

For physical iPhone testing, avoid `localhost` because that resolves to the phone itself. Use the Vercel URL or your Mac's LAN IP address.

## Notes

- Expo SDK 54 is used so the app opens in the current iOS App Store version of Expo Go.
- The app uses Expo Router with source files under `src/app`.
- `@shared/*` points to the repository-level `shared` folder. Keep shared imports React Native-compatible.
- Native `ios/` and `android/` folders are generated later with `npx expo prebuild` or by EAS Build when needed.
