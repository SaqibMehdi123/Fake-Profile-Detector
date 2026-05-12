# Setup Guide — End to end in ~1 day

This is the only doc you need. Follow it top to bottom.

---

## Prerequisites (install once, ~15 min)

| Tool | Why | Download |
|------|-----|----------|
| **Node.js LTS** (20+) | Run the React Native app | https://nodejs.org/ |
| **Python 3.11** | Run the backend | https://www.python.org/downloads/ |
| **Git** (optional) | Version control | https://git-scm.com/ |
| **Expo Go** app on your phone | Run the app without Android Studio / Xcode | Play Store / App Store |
| **ngrok** account (free) | Expose your laptop backend to the phone | https://ngrok.com/download |

After installing ngrok, run once:
```powershell
ngrok config add-authtoken <YOUR_TOKEN_FROM_NGROK_DASHBOARD>
```

You'll also need:
- A free **Google account** (for Colab)
- A free **Kaggle account** + API token (we'll get to it)

---

## STEP 1 — Train the ML model (on Colab) — ~5 min

1. Go to https://colab.research.google.com/ → **File → Upload notebook** → upload `notebook/train_model.ipynb`.
2. Get your Kaggle API token:
   - Sign in to https://www.kaggle.com/
   - Click your avatar → **Account** → **Create New API Token**
   - This downloads `kaggle.json`. Keep it handy.
3. In the Colab notebook, click **Runtime → Run all**.
4. When **Cell 2** prompts for upload, pick the `kaggle.json` you just downloaded.
5. Wait ~3–5 minutes. The last cell will auto-download two files: **`model.pkl`** and **`feature_schema.json`**.
6. Move both files into the `backend/` folder of this project.

> 💡 If you skip this step, the backend still works — it falls back to a heuristic mode and labels predictions as such in the app.

---

## STEP 2 — Run the backend (on your laptop) — ~3 min

Open PowerShell and `cd` into the `backend` folder:

```powershell
cd "D:\Projects for portfolio\Freelancing Projects\Fake Profile Detector\backend"
.\run.ps1
```

What this does:
- Creates a Python virtualenv (`.venv`) on first run
- Installs `fastapi`, `lightgbm`, `instaloader`, etc. (~2 min first time)
- Starts the server on `http://0.0.0.0:8000`

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Open `http://localhost:8000` in a browser to verify — you'll see a JSON response.

> ⚠️ If PowerShell blocks the script, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## STEP 3 — Expose the backend with ngrok — ~1 min

Open a **second** PowerShell window (leave the backend running in the first one):

```powershell
ngrok http 8000
```

You'll see:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:8000
```

**Copy that `https://...ngrok-free.app` URL.** You'll paste it into the app in Step 5.

---

## STEP 4 — Install and run the React Native app — ~5 min

Open a **third** PowerShell window:

```powershell
cd "D:\Projects for portfolio\Freelancing Projects\Fake Profile Detector\mobile"
npm install
npx expo start
```

A QR code appears in the terminal.

- **On your phone:** open the **Expo Go** app and scan the QR.
- The app builds (~30 sec first time) and launches on your phone.

---

## STEP 5 — Connect the app to the backend — 30 sec

In the app:
1. Go to **Settings** tab (bottom right).
2. Paste your ngrok URL into **API base URL** (e.g. `https://abc123.ngrok-free.app`).
3. Tap **Save** → then **Test**. You should see "Connected · mode: ml" (or "heuristic" if you skipped Step 1).

You're done. Test it on the Home tab.

---

## Demo flow (what to show your friend)

1. Open app — point out the live status badge ("ML model online").
2. Tap **Username Check** → try `john1234567` → instant high suspicion. Try `johndoe` → low.
3. Tap **Bio Analyzer** → paste `Earn $$$ free crypto, DM me on telegram!` → high spam score.
4. Tap **Manual Analysis** → fill some fake-looking numbers (1 follower, 2000 following, no profile pic, no bio) → see the gauge animate.
5. Tap **Detect by Link** → paste a real Instagram URL (e.g. `https://instagram.com/instagram`). If scraping works, you get auto-filled features and a verdict. If blocked, the app gracefully redirects you to Manual with prefill.
6. Show **History** tab — every check is saved.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails on Windows with native module errors | Make sure Node.js is **20+**. Delete `node_modules` and try again. |
| `expo start` hangs | Run `npx expo start --tunnel` (helps when phone & laptop aren't on same Wi-Fi). |
| App says "Backend offline" | Check ngrok window is still running. ngrok-free URLs change every restart — re-paste in Settings. |
| `ngrok` command not found | Add the ngrok install dir to PATH, or run from where you unzipped it. |
| Backend says "module not found: lightgbm" | The `.venv` didn't activate. Run `.\.venv\Scripts\Activate.ps1` then `pip install -r requirements.txt`. |
| Instagram scrape fails | Instaloader without login is rate-limited. Use Manual mode — that's why it exists. |
| Twitter/X scrape always fails | Nitter mirrors come and go. Manual mode is the reliable path for X. |
| Colab notebook says "kaggle dataset not found" | Your `kaggle.json` was rejected. Re-download a fresh one from kaggle.com/settings. |

---

## Extending later (optional, post-deadline)

- **Add image-based checks** — extend backend with a CLIP / ResNet check on profile pics for "stock photo / AI-generated" detection.
- **Add more datasets** — Cresci-2017, TwiBot-22 (gated), Bot Repository.
- **Deploy backend permanently** — push `backend/` to Render free tier, paste the URL in app Settings instead of ngrok.
- **Build standalone APK** — `eas build -p android --profile preview` (requires EAS account).

---

## Architecture reference

```
mobile/
├── App.tsx                       # Paper provider, navigation root
├── src/
│   ├── theme.ts                  # colors / gradients / risk palette
│   ├── api.ts                    # fetch wrapper around backend
│   ├── store.ts                  # zustand history store
│   ├── navigation/AppNavigator.tsx
│   ├── components/               # gauge, reason list, cards, picker
│   └── screens/                  # one file per screen
backend/
├── main.py                       # FastAPI endpoints
├── model_service.py              # loads model.pkl or falls back to heuristic
├── scrapers.py                   # IG / X / FB best-effort public scrapers
├── feature_engineering.py        # feature vector + username/bio analyzers
├── schemas.py                    # Pydantic request/response models
└── requirements.txt
notebook/
└── train_model.ipynb             # Colab: download datasets → train → export pkl
```

## Endpoints

```
GET  /health                  →  {status, mode}
POST /predict/features        →  full ML prediction from manual features
POST /predict/link            →  scrape URL + predict (with soft fallback)
POST /analyze/username        →  username heuristic only
POST /analyze/bio             →  bio heuristic only
```
