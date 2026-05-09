# PharmaChain Mobile App — Complete Step-by-Step Guide

> **Beginner friendly.** Every command is explained before you run it.
> **Platform:** Windows 11, ASP.NET Core 6 backend, Expo + React Native.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [One-Time Setup (Install Tools)](#2-one-time-setup-install-tools)
3. [Step 1 — Run the Backend (ASP.NET Core)](#3-step-1--run-the-backend)
4. [Step 2 — Expose the Backend with ngrok](#4-step-2--expose-with-ngrok)
5. [Step 3 — Connect the Mobile App to Your Site](#5-step-3--connect-the-mobile-app)
6. [Step 4 — Run the App on Your Phone](#6-step-4--run-on-your-phone)
7. [Step 5 — Save Your Project (GitHub)](#7-step-5--save-to-github)
8. [Step 6 — Reopening the Project Later](#8-step-6--reopen-later)
9. [Step 7 — Build the Final APK](#9-step-7--build-apk)
10. [Folder Structure Explained](#10-folder-structure)
11. [How to Edit the App Later](#11-how-to-edit-later)
12. [Common Problems and Fixes](#12-common-problems-and-fixes)

---

## 1. What This App Does

This is a **WebView wrapper** — a thin native shell that opens your existing
PharmaChain website inside a mobile app. You do NOT rebuild the frontend.
The website runs on your PC, ngrok creates a public HTTPS URL, and the phone
loads that URL inside the app.

```
Your Phone (Expo Go)
    └── WebView
            └── https://xxxx.ngrok-free.app   (public URL)
                    └── http://localhost:7xxx  (your ASP.NET backend on PC)
```

---

## 2. One-Time Setup (Install Tools)

> Do these steps once. Skip any tool you already have.

### A. Install Node.js

Node.js is the runtime that Expo needs.

1. Go to https://nodejs.org and download the **LTS** version.
2. Install it (keep all defaults).
3. Verify: open PowerShell and run:
   ```powershell
   node --version   # should print v18.x or v20.x
   npm --version    # should print 9.x or 10.x
   ```

### B. Install Expo CLI

Expo CLI is the command that starts your mobile app project.

```powershell
# This installs Expo CLI globally on your PC
npm install -g expo-cli eas-cli
```

### C. Install ngrok

ngrok creates a public HTTPS tunnel to your localhost.

1. Go to https://ngrok.com and create a **free account**.
2. Download the Windows installer and extract `ngrok.exe` somewhere (e.g. `C:\tools\ngrok.exe`).
3. Add it to your PATH **or** just call it with the full path.
4. Authenticate (one time):
   ```powershell
   # Replace YOUR_TOKEN with the token shown on your ngrok dashboard
   ngrok config add-authtoken YOUR_TOKEN
   ```

### D. Install Expo Go on Your Phone

- **Android:** Search "Expo Go" on the Google Play Store and install it.
- **iPhone:** Search "Expo Go" on the App Store and install it.

### E. Install Project Dependencies

Open PowerShell, navigate to the mobile app folder, and install packages:

```powershell
# Navigate to the mobile app folder inside your project
cd "C:\Users\DELL\Desktop\PharmaChain\PharmaChainApp"

# Install all packages listed in package.json
# npm reads package.json and downloads everything into node_modules/
npm install
```

---

## 3. Step 1 — Run the Backend

The ASP.NET Core backend must be running before you can view the site.

```powershell
# Go to the root of your PharmaChain project
cd "C:\Users\DELL\Desktop\PharmaChain"

# Start the backend server
# 'dotnet run' compiles and starts the ASP.NET Core app
dotnet run
```

You will see output like:
```
Now listening on: https://localhost:7123
Now listening on: http://localhost:5123
```

**Write down the https port number (7123 in this example).**
Keep this terminal open — closing it stops the backend.

---

## 4. Step 2 — Expose with ngrok

Open a **second** PowerShell window (leave the first one running).

```powershell
# Replace 7123 with YOUR actual https port from Step 1
# ngrok creates a public tunnel to your local HTTPS server
ngrok http https://localhost:7123
```

You will see a screen like:
```
Forwarding   https://a1b2-102-45-67-89.ngrok-free.app -> https://localhost:7123
```

**Copy the full `https://...ngrok-free.app` URL.**

> **Important:** ngrok URLs change every time you restart ngrok (free plan).
> You must update the URL in `App.js` each time you restart.

### Test it in a browser first

Open Chrome and paste your ngrok URL. You should see the PharmaChain login page.
If you see a warning page from ngrok, click "Visit Site" — that's normal for the
free plan when using a browser, but the mobile app bypasses it automatically.

---

## 5. Step 3 — Connect the Mobile App

Open `PharmaChainApp/App.js` in any text editor (Notepad, VS Code, etc.).

Find this line near the top:

```js
const SITE_URL = 'https://YOUR_NGROK_URL_HERE.ngrok-free.app';
```

Replace it with your actual ngrok URL:

```js
const SITE_URL = 'https://a1b2-102-45-67-89.ngrok-free.app';
```

Save the file (Ctrl+S).

---

## 6. Step 4 — Run on Your Phone

Open a **third** PowerShell window.

```powershell
cd "C:\Users\DELL\Desktop\PharmaChain\PharmaChainApp"

# Start the Expo development server
# This serves the app and shows a QR code
npx expo start
```

You will see a QR code in the terminal.

**On Android:**
- Open Expo Go → tap "Scan QR Code" → scan the code.

**On iPhone:**
- Open the default Camera app → point at the QR code → tap the banner.

The app will load on your phone showing the PharmaChain website.

### Expo connection modes

If the QR code does not connect, try tunnel mode (works even on different networks):

```powershell
npx expo start --tunnel
```

> Tunnel mode routes traffic through Expo's servers. It is slower but works
> when your phone and PC are on different Wi-Fi networks or VPN.

---

## 7. Step 5 — Save to GitHub

Run these commands once to push the app to GitHub.

```powershell
# Go to the mobile app folder
cd "C:\Users\DELL\Desktop\PharmaChain\PharmaChainApp"

# Initialize a Git repository (skip if already inside the PharmaChain repo)
git init

# Stage all files
git add .

# Create the first commit
git commit -m "feat: add Expo React Native WebView mobile app"

# Add your GitHub remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/pharmachain-mobile.git

# Push
git push -u origin main
```

> Alternatively, just commit the `PharmaChainApp/` folder inside your existing
> PharmaChain repository — it will be tracked alongside the backend code.

### To save progress in future sessions

```powershell
git add .
git commit -m "update: describe what you changed"
git push
```

---

## 8. Step 6 — Reopen Later

Every time you reopen the project after shutting down, follow this checklist:

| # | Action | Command |
|---|--------|---------|
| 1 | Start the ASP.NET backend | `cd C:\...\PharmaChain && dotnet run` |
| 2 | Start ngrok | `ngrok http https://localhost:7123` |
| 3 | Copy new ngrok URL | (from ngrok output) |
| 4 | Paste URL into `App.js` | Edit `SITE_URL` constant |
| 5 | Start Expo | `cd PharmaChainApp && npx expo start` |
| 6 | Scan QR on phone | Use Expo Go or Camera app |

---

## 9. Step 7 — Build APK

To produce a real `.apk` file you can install on any Android phone (no Expo Go needed).

### A. Create an Expo account

Go to https://expo.dev and sign up for a free account.

### B. Log in from terminal

```powershell
# Log in to your Expo account
eas login
```

### C. Configure the project

```powershell
cd "C:\Users\DELL\Desktop\PharmaChain\PharmaChainApp"

# Initialize EAS Build for this project (one time)
eas build:configure
```

### D. Set your ngrok URL as permanent

Before building, update `App.js` with a permanent URL. Options:
- **Best option:** Deploy your backend to a cloud host (Azure, Railway, Render)
  so the URL never changes.
- **Temporary:** Use your current ngrok URL (the APK will break when ngrok restarts).

### E. Build the APK

```powershell
# Build an APK for Android (uses the "preview" profile in eas.json)
# This runs in the cloud — no Android Studio needed on your PC
eas build --platform android --profile preview
```

The command uploads your code to Expo's cloud build servers and returns a
download link for the `.apk` file when done (usually 5–15 minutes).

### F. Install the APK on your phone

1. Download the `.apk` from the link Expo provides.
2. Transfer it to your Android phone via USB or Google Drive.
3. On the phone: Settings → Install unknown apps → allow your file manager.
4. Tap the `.apk` file to install.

---

## 10. Folder Structure

```
PharmaChainApp/
├── App.js                  ← Main entry: WebView + back button + overlays
├── app.json                ← Expo config: app name, icon, permissions
├── package.json            ← Dependencies list
├── babel.config.js         ← Transpiler config (don't touch)
├── eas.json                ← Build profiles (APK vs AAB vs dev)
├── .gitignore              ← Files Git should ignore
├── components/
│   ├── LoadingScreen.js    ← Animated splash shown while page loads
│   └── ErrorScreen.js      ← Error page with retry button + checklist
└── assets/
    ├── icon.png            ← App icon (1024×1024 px)
    ├── splash.png          ← Splash screen image (1242×2436 px)
    ├── adaptive-icon.png   ← Android adaptive icon foreground (1024×1024 px)
    └── favicon.png         ← Web favicon (48×48 px)
```

> **Icons:** Expo requires real image files in `assets/`. Before your first
> `eas build`, add your own PNG images. Placeholder images will cause build
> warnings. You can generate all sizes from one image at https://www.appicon.co/.

---

## 11. How to Edit the App Later

### Change the website URL

Open `App.js` and edit line 17:
```js
const SITE_URL = 'https://your-new-url.ngrok-free.app';
```

### Change the app name

Open `app.json` and edit:
```json
"name": "PharmaChain",
"slug": "pharmachain-mobile"
```

### Change the splash / status bar color

In `app.json`:
```json
"splash": { "backgroundColor": "#0d9488" }
```

In `App.js`:
```jsx
<ExpoStatusBar style="light" backgroundColor="#0d9488" />
```

In `LoadingScreen.js`:
```js
backgroundColor: '#0d9488'   // logoBox and spinner color
```

### Add a fixed toolbar / navigation bar

If you want a native bottom bar, add it in `App.js` between the
`<SafeAreaView>` and `<View style={styles.container}>`:
```jsx
import { TouchableOpacity } from 'react-native';
// Then add buttons that call webViewRef.current?.goBack() etc.
```

---

## 12. Common Problems and Fixes

### Problem: "Unable to resolve host" / blank screen

**Cause:** ngrok is not running or the URL in `App.js` is wrong.

**Fix:**
1. Check ngrok is running in its terminal.
2. Copy the exact URL from ngrok output.
3. Paste it into `SITE_URL` in `App.js`.
4. Press `r` in the Expo terminal to reload.

---

### Problem: CORS error (API calls fail)

**What is CORS?** Browsers and WebViews block requests from one origin (your
phone/ngrok URL) to another origin (your backend) unless the backend
explicitly allows it.

**Good news:** Your `Program.cs` already has:
```csharp
policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
```
This allows all origins, so CORS should not be an issue.

If it still fails, make sure `app.UseCors("AllowAll")` comes **before**
`app.UseAuthentication()` in `Program.cs` (it does in your current code).

---

### Problem: Mixed content (HTTP inside HTTPS)

**What is it?** Your site is served over HTTPS (ngrok), but some resources
or API calls might use plain HTTP.

**Fix in `app.json`** (already included):
```json
"plugins": [["expo-build-properties", {"android": {"usesCleartextTraffic": true}}]]
```

**Fix in `App.js`** (already included):
```jsx
mixedContentMode="always"
```

---

### Problem: Expo QR code doesn't connect

**Fix options (try in order):**
1. Make sure phone and PC are on the **same Wi-Fi** network.
2. Disable Windows Firewall temporarily.
3. Use tunnel mode: `npx expo start --tunnel`
4. Switch to LAN mode: `npx expo start --lan`

---

### Problem: ngrok URL expires / changes

ngrok free-plan URLs change every time ngrok restarts.

**Short-term fix:** Update `SITE_URL` in `App.js` and reload Expo.

**Permanent fix options:**
- Pay for ngrok's static domain plan (~$10/month).
- Deploy your backend to a free cloud host:
  - **Azure App Service** (free tier for .NET)
  - **Railway.app** (free tier, supports .NET)
  - **Render.com** (free tier)

---

### Problem: Camera / QR scanner does not work inside WebView

**Fix:** Permissions are already declared in `app.json`. If a specific page
uses the camera, make sure your ASP.NET site requests the feature over HTTPS
(camera access is blocked on HTTP origins by most browsers and WebViews).

---

### Problem: Login session lost on reload

**Fix:** The WebView uses `sharedCookiesEnabled={true}` and
`domStorageEnabled={true}` (both already set in `App.js`), which preserves
cookies and localStorage between page navigations.

---

### Problem: Text is too small on the phone

**Fix:** Injected JS (already in `App.js`) sets the correct viewport meta:
```
width=device-width, initial-scale=1.0, maximum-scale=1.0
```
If individual pages still look zoomed out, make sure those HTML pages have
`<meta name="viewport" ...>` in their `<head>` — or the injected JS will
add it automatically.

---

## Running on Google Colab

Google Colab cannot run Expo's interactive terminal UI. Use it only for
the .NET backend:

```python
# In a Colab cell — install and run the backend
!apt-get install -y dotnet-sdk-6.0 > /dev/null
!cd /content && git clone https://github.com/YOUR_USERNAME/PharmaChain.git
!cd /content/PharmaChain && dotnet run &

# Install ngrok
!pip install pyngrok -q
from pyngrok import ngrok
tunnel = ngrok.connect(7123, "http")
print("Your public URL:", tunnel.public_url)
```

Then paste the printed URL into `App.js` on your local PC and run Expo there.

---

## Quick Reference Card

```
EVERY SESSION:
  Terminal 1:  cd PharmaChain  &&  dotnet run
  Terminal 2:  ngrok http https://localhost:PORT
  App.js:      update SITE_URL with new ngrok URL
  Terminal 3:  cd PharmaChainApp  &&  npx expo start
  Phone:       scan QR with Expo Go

SAVE WORK:
  git add .  &&  git commit -m "message"  &&  git push

BUILD APK:
  eas build --platform android --profile preview
```
