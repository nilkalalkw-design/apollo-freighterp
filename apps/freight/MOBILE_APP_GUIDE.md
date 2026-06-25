# Apollo-Freight Solutions Mobile App

This project is prepared for Android and iPhone using Capacitor. It packages the existing React web app into native mobile projects, while the app continues to connect to the live Render API.

## What Is Included

- Android native project folder: `android`
- iPhone/iOS native project folder: `ios`
- Mobile config: `capacitor.config.json`
- Mobile scripts in `package.json`

## Main Commands

Run these commands from the project root:

```powershell
cd C:\Users\ApolloIT\Documents\Codex\2026-04-19-where-is-the-code-or-aplicaiton
npm.cmd run mobile:sync
```

This builds the React app and copies it into the Android/iOS projects.

## Android Build

Requirements:

- Android Studio
- Android SDK installed from Android Studio
- Java/JDK supported by Android Studio

Open Android Studio:

```powershell
npm.cmd run mobile:open:android
```

Then in Android Studio:

1. Wait for Gradle sync to finish.
2. Test using an emulator or connected Android phone.
3. Build APK from `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

## iPhone Build

Requirements:

- Mac computer
- Xcode
- Apple Developer account for real device/App Store signing

On the Mac, open the iOS project:

```bash
npm run mobile:open:ios
```

Then in Xcode:

1. Select your Apple Team under Signing & Capabilities.
2. Test using iPhone simulator or connected iPhone.
3. Archive the app for TestFlight or App Store release.

## After Every Web App Change

Whenever the React app is changed, run:

```powershell
npm.cmd run mobile:sync
```

Then rebuild from Android Studio or Xcode.
