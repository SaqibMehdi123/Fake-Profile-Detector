# Client Guide: Fake Profile Detector

Welcome to the Fake Profile Detector project! This guide will walk you through how to use, run, and manage the application step by step.

## Project Overview
The project consists of two main parts:
1. **Backend (Python/FastAPI):** Handles the machine learning model predictions, heuristic checks, and scraping public data from Instagram, X (Twitter), and Facebook.
2. **Mobile App (React Native/Expo):** The user interface where you can analyze profiles via links, manual entry, usernames, or bios.

---

## 1. Running the Project Locally

### Step 1: Start the Backend Server
The backend must be running for the app to perform predictions and scraping.
1. Open a terminal (PowerShell or Command Prompt).
2. Navigate to the `backend` folder:
   ```bash
   cd "path\to\Fake Profile Detector\backend"
   ```
3. Run the startup script:
   ```bash
   .\run.ps1
   ```
   *Note: This will install dependencies on the first run and start the server at `http://0.0.0.0:8000`.*

### Step 2: Start the Mobile App
1. Open a new terminal.
2. Navigate to the `mobile` folder:
   ```bash
   cd "path\to\Fake Profile Detector\mobile"
   ```
3. Start the Expo server in LAN mode:
   ```bash
   npx expo start --lan
   ```
4. **On your mobile device:**
   - Connect to the **same Wi-Fi network** as your computer.
   - Open the **Expo Go** app (downloadable from App Store / Google Play).
   - Scan the QR code displayed in your terminal.

### Step 3: Auto-Connection
The app is now configured to **automatically detect** your backend's IP address and connect to it. You no longer need to manually copy and paste the URL.
If you ever need to check the connection, go to the **Settings** tab in the app. It will show a green `Connected` status if it successfully reached the backend.

---

## 2. Using the App

The app offers 4 main detection methods on the **Home** tab:

1. **Detect by Link:** Paste a profile URL from Instagram, X, or Facebook. The backend will attempt to extract public data and run the ML model. If the platform blocks the scrape, it gracefully falls back to Manual Analysis.
2. **Manual Analysis:** Enter profile numbers and flags manually (followers, following, bio length, etc.). This is 100% reliable as it avoids web scraping blocks.
3. **Username Check:** Instantly analyzes a username for bot-like patterns (e.g., lots of digits, underscores). This is a fast, offline heuristic check.
4. **Bio Analyzer:** Paste a user's bio to detect spam keywords, excessive links, and bot-like language.

All your checks are saved in the **History** tab so you can review them later.

---

## 3. Building an APK (Android App)

To generate a standalone `.apk` file that you can share with clients or install without Expo Go:

### Option A: Cloud Build (Recommended, Easiest)
Expo Application Services (EAS) can build the APK in the cloud.
1. Create a free account at [expo.dev](https://expo.dev).
2. In your terminal, inside the `mobile` folder, log in:
   ```bash
   npx eas-cli login
   ```
3. Run the build command for an APK:
   ```bash
   npx eas-cli build -p android --profile preview
   ```
4. Wait for the build to finish (usually 10-15 mins). EAS will provide a link to download your `.apk` file.

### Option B: Local Build
If you have Android Studio installed and configured on your machine, you can build it locally:
```bash
npx eas-cli build -p android --profile preview --local
```

---

## 4. Deploying for Production (Optional)
If you want the app to work anywhere (not just on your local Wi-Fi), you will need to host the backend on a cloud provider like **Render, Heroku, or AWS**. 
Once deployed, you would update the `DEFAULT_BASE` URL in the mobile app (`src/api.ts`) to point to your live backend domain instead of your local IP.

## Troubleshooting
- **App says "Backend offline":** Ensure the backend terminal is running without errors and your phone is on the same Wi-Fi as your computer.
- **Scraping fails (Detect by Link):** Social media platforms heavily block automated scraping. The app is designed to fallback to the Manual Analysis screen if this happens.
