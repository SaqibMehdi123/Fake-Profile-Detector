"""Loads model.pkl if present; falls back to a transparent heuristic when missing.

This means the backend works *immediately* even before you finish the Colab
training notebook — you'll just get heuristic predictions until you drop in
the trained model.pkl.
"""
from __future__ import annotations
import os
import joblib
import numpy as np
from feature_engineering import to_feature_vector, FEATURE_COLS, explain_features
from schemas import FeatureInput, PredictionResult, Reason


HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(HERE, "model.pkl")

_model = None
_using_heuristic = True


def _load_model():
    global _model, _using_heuristic
    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            _using_heuristic = False
            print(f"[model_service] Loaded trained model from {MODEL_PATH}")
        except Exception as e:
            print(f"[model_service] Failed to load model.pkl: {e}. Using heuristic.")
            _model = None
            _using_heuristic = True
    else:
        print("[model_service] model.pkl not found — using heuristic fallback. "
              "Run the Colab notebook and drop model.pkl into backend/ to enable ML.")


_load_model()


def _heuristic_probability(inp: FeatureInput) -> float:
    """Hand-tuned scoring as fallback. Mirrors known fake-profile signals."""
    score = 0.0
    # Profile completeness
    if not inp.has_profile_pic:        score += 0.20
    if not inp.bio:                    score += 0.10
    if inp.posts_count == 0:           score += 0.15
    # Follower dynamics
    ff = inp.followers_count / max(inp.following_count, 1)
    if inp.following_count > 1000 and ff < 0.05:  score += 0.25
    if inp.followers_count == 0 and inp.following_count > 50:  score += 0.15
    # Username
    if inp.username:
        digits = sum(c.isdigit() for c in inp.username)
        if digits / max(len(inp.username), 1) > 0.4:  score += 0.15
        if inp.username.isdigit():     score += 0.20
    # Engagement plausibility
    if inp.posts_count > 0 and inp.followers_count / max(inp.posts_count, 1) > 5000:
        score += 0.10  # huge follower-to-post ratio looks bought
    # Positives that reduce score
    if inp.has_profile_pic and inp.bio and inp.posts_count > 5 and ff > 0.1:
        score -= 0.15
    return float(np.clip(score, 0.02, 0.98))


def predict(inp: FeatureInput) -> PredictionResult:
    if _model is not None:
        x = np.array(to_feature_vector(inp), dtype=np.float64).reshape(1, -1)
        proba = float(_model.predict_proba(x)[0, 1])
        # Top feature contributions via LightGBM importance-weighted absolute deviation
        try:
            importances = _model.feature_importances_
            top_idx = np.argsort(importances)[::-1][:5]
            top = [{"feature": FEATURE_COLS[i], "importance": int(importances[i]),
                    "value": float(x[0, i])} for i in top_idx]
        except Exception:
            top = []
    else:
        proba = _heuristic_probability(inp)
        top = []

    is_fake = proba >= 0.5
    confidence = "high" if abs(proba - 0.5) > 0.30 else ("medium" if abs(proba - 0.5) > 0.15 else "low")
    if proba < 0.35:      risk = "safe"
    elif proba < 0.65:    risk = "suspicious"
    else:                 risk = "likely_fake"

    reasons = explain_features(inp, proba)
    notes = []
    if _using_heuristic:
        notes.append("Using heuristic mode — drop model.pkl into backend/ to enable the trained ML model.")

    return PredictionResult(
        is_fake=is_fake,
        fake_probability=round(proba, 4),
        confidence=confidence,
        risk_level=risk,
        reasons=reasons,
        top_features=top,
        extracted=inp,
        notes=notes,
    )


def using_heuristic() -> bool:
    return _using_heuristic
