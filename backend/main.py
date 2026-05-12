"""FastAPI entrypoint. Run with:  uvicorn main:app --reload --host 0.0.0.0 --port 8000"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    FeatureInput, LinkInput, UsernameInput, BioInput,
    PredictionResult, ScrapeResult, Reason,
)
from model_service import predict, using_heuristic
from feature_engineering import analyze_username, analyze_bio
from scrapers import scrape_url

app = FastAPI(title="Fake Profile Detector API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "Fake Profile Detector API",
        "status": "ok",
        "mode": "heuristic" if using_heuristic() else "ml",
        "endpoints": [
            "GET  /health",
            "POST /predict/features",
            "POST /predict/link",
            "POST /analyze/username",
            "POST /analyze/bio",
        ],
    }


@app.get("/health")
def health():
    return {"status": "ok", "mode": "heuristic" if using_heuristic() else "ml"}


@app.post("/predict/features", response_model=PredictionResult)
def predict_features(inp: FeatureInput):
    return predict(inp)


@app.post("/predict/link", response_model=PredictionResult)
def predict_link(inp: LinkInput):
    scrape = scrape_url(inp.url)

    # Full success: scraped public profile, run ML on all features
    if scrape.success and scrape.extracted is not None:
        result = predict(scrape.extracted)
        result.notes.append(scrape.message)
        return result

    # Partial: scrape failed but we got a username from the URL.
    # Run the username heuristic so the user still gets a verdict.
    extracted = scrape.extracted
    if extracted is not None and extracted.username:
        score, reasons = analyze_username(extracted.username)
        if score < 0.25:
            risk = "safe"
        elif score < 0.5:
            risk = "suspicious"
        else:
            risk = "likely_fake"
        return PredictionResult(
            is_fake=score >= 0.5,
            fake_probability=round(score, 4),
            confidence="low",
            risk_level=risk,
            reasons=reasons,
            extracted=extracted,
            notes=[
                scrape.message,
                "PARTIAL_ANALYSIS",
                f"This is a username-only check on @{extracted.username}. For a full ML verdict, tap 'Get full analysis' to fill in profile stats.",
            ],
        )

    # Couldn't even pull a username from the URL
    return PredictionResult(
        is_fake=False,
        fake_probability=0.0,
        confidence="low",
        risk_level="safe",
        reasons=[Reason(label="Could not extract any data from this URL", impact="neutral")],
        extracted=extracted,
        notes=[scrape.message, "SCRAPE_FAILED"],
    )


@app.post("/analyze/username")
def analyze_username_endpoint(inp: UsernameInput):
    score, reasons = analyze_username(inp.username)
    return {
        "username": inp.username,
        "platform": inp.platform,
        "suspicion_score": round(score, 3),
        "risk_level": "likely_fake" if score >= 0.5 else ("suspicious" if score >= 0.25 else "safe"),
        "reasons": [r.model_dump() for r in reasons],
    }


@app.post("/analyze/bio")
def analyze_bio_endpoint(inp: BioInput):
    score, reasons = analyze_bio(inp.text)
    return {
        "text": inp.text,
        "suspicion_score": round(score, 3),
        "risk_level": "likely_fake" if score >= 0.5 else ("suspicious" if score >= 0.25 else "safe"),
        "reasons": [r.model_dump() for r in reasons],
    }
