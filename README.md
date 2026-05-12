# Fake Profile Detector

A multi-platform mobile app (Instagram / X / Facebook) that detects fake / bot profiles using a LightGBM ML model + heuristic checks.

```
┌───────────────────┐    HTTPS    ┌────────────────────┐
│ React Native app  │ ──────────▶ │ FastAPI backend    │
│ (Expo)            │ ◀────────── │ + LightGBM (.pkl)  │
└───────────────────┘             └────────────────────┘
                                            │
                                  ┌─────────┴──────────┐
                                  │ instaloader (IG)   │
                                  │ nitter (X)         │
                                  │ facebook-scraper   │
                                  └────────────────────┘
```

## What's in this repo

| Folder | What it is |
|--------|------------|
| `notebook/train_model.ipynb` | Colab notebook — trains the model, exports `model.pkl` |
| `backend/`                   | FastAPI server (Python) — runs the model + scrapers |
| `mobile/`                    | React Native app (Expo) — the UI |

## Detection methods (4 modes in the app)

1. **Detect by Link** — paste IG/X/FB URL → backend scrapes public profile → ML predicts.
2. **Manual Analysis** — fill the form yourself. Always works, even when scraping is blocked.
3. **Username Check** — instant heuristic check on handle pattern (digit ratio, all-numeric, suspicious patterns).
4. **Bio Analyzer** — paste bio → spam keyword + link density + contact-method scan.

History of past checks is stored locally on the phone.

## Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) next

It walks you through every install and command end-to-end.
