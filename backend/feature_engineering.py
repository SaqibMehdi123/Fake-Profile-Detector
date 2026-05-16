"""Feature engineering: username/bio heuristics + harmonized feature vector."""
from __future__ import annotations
import re
from schemas import FeatureInput, Reason


FEATURE_COLS = [
    "followers_count", "following_count", "posts_count",
    "bio_length", "has_profile_pic", "has_external_url", "is_private",
    "username_length", "username_digit_count", "username_digit_ratio",
    "fullname_word_count", "name_equals_username",
    "followers_following_ratio", "posts_per_follower",
    "platform_instagram", "platform_twitter", "platform_facebook",
]


def _safe_div(a: float, b: float) -> float:
    return a / b if b else 0.0


def to_feature_vector(inp: FeatureInput) -> list[float]:
    username = inp.username or ""
    full_name = inp.full_name or ""
    bio = inp.bio or ""

    username_len = len(username)
    digit_count = sum(c.isdigit() for c in username)
    digit_ratio = _safe_div(digit_count, max(username_len, 1))

    return [
        float(inp.followers_count),
        float(inp.following_count),
        float(inp.posts_count),
        float(len(bio)),
        1.0 if inp.has_profile_pic else 0.0,
        1.0 if inp.has_external_url else 0.0,
        1.0 if inp.is_private else 0.0,
        float(username_len),
        float(digit_count),
        float(digit_ratio),
        float(len(full_name.split())) if full_name else 0.0,
        1.0 if username and full_name and username.lower() == full_name.lower().replace(" ", "") else 0.0,
        _safe_div(inp.followers_count, max(inp.following_count, 1)),
        _safe_div(inp.posts_count, max(inp.followers_count, 1)),
        1.0 if inp.platform == "instagram" else 0.0,
        1.0 if inp.platform == "twitter" else 0.0,
        1.0 if inp.platform == "facebook" else 0.0,
    ]


SPAM_KEYWORDS = [
    "click", "free", "win", "winner", "earn", "$$$", "crypto", "bitcoin",
    "investment", "guaranteed", "100%", "follow back", "f4f", "l4l",
    "dm me", "telegram", "whatsapp +", "onlyfans", "promo", "discount code",
    "make money", "passive income", "weight loss", "follow me", "sub4sub",
]


def analyze_username(username: str) -> tuple[float, list[Reason]]:
    """Return (suspicion 0-1, reasons).

    Note: long digit suffixes (like 'saqibme03871376') are common on Twitter where the
    platform auto-suggests handles for new sign-ups. We treat that pattern as NEUTRAL —
    only flag clearly suspicious patterns (all-digits, gibberish, etc.).
    """
    reasons: list[Reason] = []
    if not username:
        return 0.5, [Reason(label="No username provided", impact="neutral")]

    score = 0.0
    digits = sum(c.isdigit() for c in username)
    letters = sum(c.isalpha() for c in username)
    underscores = username.count("_")
    is_all_digits = username.isdigit()
    # Gibberish detection: long letter sequence with no vowels = probably random
    letter_seq = re.sub(r"[^a-zA-Z]", "", username).lower()
    has_no_vowels = (len(letter_seq) >= 6 and not any(v in letter_seq for v in "aeiou"))

    if is_all_digits:
        score += 0.55
        reasons.append(Reason(label="Username is all digits — almost certainly a bot", impact="negative"))
    elif letters == 0 and digits >= 4:
        score += 0.45
        reasons.append(Reason(label="No letters in username", impact="negative"))

    if has_no_vowels:
        score += 0.25
        reasons.append(Reason(label="Username letters look random (no vowels)", impact="negative"))

    if underscores >= 4:
        score += 0.15
        reasons.append(Reason(label="Excessive underscores", impact="negative"))

    if len(username) <= 2:
        score += 0.15
        reasons.append(Reason(label="Extremely short username", impact="neutral"))

    # Long-digit-suffix usernames (like 'saqibme03871376' or 'user12345678') are AUTO-SUGGESTED
    # by Twitter/X for new sign-ups. We add a small contextual note but no fake score.
    if re.search(r"[a-z]{3,}\d{6,}$", username.lower()):
        reasons.append(Reason(
            label="Looks auto-suggested by the platform (word + digit suffix) — common for new accounts",
            impact="neutral"))

    if score == 0:
        reasons.append(Reason(label="Username pattern looks normal", impact="positive"))

    return min(score, 1.0), reasons


def analyze_bio(text: str) -> tuple[float, list[Reason]]:
    reasons: list[Reason] = []
    if not text:
        return 0.55, [Reason(label="Empty bio — fake accounts often skip bios", impact="negative")]

    score = 0.0
    lower = text.lower()
    link_count = len(re.findall(r"https?://|www\.|\.com|\.io|\.ly|t\.me/", lower))
    emoji_count = len(re.findall(r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF]", text))
    spam_hits = sum(1 for kw in SPAM_KEYWORDS if kw in lower)
    contact_hits = sum(1 for p in ["telegram", "whatsapp", "snap", "dm "] if p in lower)
    has_currency = bool(re.search(r"[\$€£]\d|\d+%\s*off|\d+\s*usd", lower))

    if spam_hits >= 2:
        score += 0.35
        reasons.append(Reason(label=f"{spam_hits} spam-like keywords detected", impact="negative"))
    elif spam_hits == 1:
        score += 0.15
        reasons.append(Reason(label="Spam-like keyword detected", impact="negative"))
    if link_count >= 2:
        score += 0.2
        reasons.append(Reason(label="Multiple links in bio", impact="negative"))
    if contact_hits >= 1:
        score += 0.2
        reasons.append(Reason(label="External contact methods (Telegram/WhatsApp/DM)", impact="negative"))
    if has_currency:
        score += 0.15
        reasons.append(Reason(label="Currency or discount mentions", impact="negative"))
    if emoji_count > 8:
        score += 0.1
        reasons.append(Reason(label="Excessive emoji use", impact="negative"))
    if len(text) < 10:
        score += 0.1
        reasons.append(Reason(label="Very short bio", impact="neutral"))

    if score == 0:
        reasons.append(Reason(label="Bio looks natural", impact="positive"))

    return min(score, 1.0), reasons


def explain_features(inp: FeatureInput, prob: float) -> list[Reason]:
    """Plain-language reasons based on raw features (works without SHAP)."""
    reasons: list[Reason] = []

    ff_ratio = _safe_div(inp.followers_count, max(inp.following_count, 1))
    if inp.following_count > 1000 and ff_ratio < 0.1:
        reasons.append(Reason(label=f"Follows many ({inp.following_count}) but few followers — classic bot pattern", impact="negative"))
    elif ff_ratio > 5:
        reasons.append(Reason(label="Healthy follower-to-following ratio", impact="positive"))

    if not inp.has_profile_pic:
        reasons.append(Reason(label="No profile picture", impact="negative"))
    else:
        reasons.append(Reason(label="Has a profile picture", impact="positive"))

    if inp.posts_count == 0 and inp.followers_count > 100:
        reasons.append(Reason(label="Zero posts despite having followers", impact="negative"))
    elif inp.posts_count > 20:
        reasons.append(Reason(label=f"Active history ({inp.posts_count} posts)", impact="positive"))

    if not inp.bio:
        reasons.append(Reason(label="Empty bio", impact="negative"))

    if inp.username:
        u_score, u_reasons = analyze_username(inp.username)
        # bring in only top 2 negative username reasons
        reasons.extend([r for r in u_reasons if r.impact == "negative"][:2])

    if inp.bio:
        b_score, b_reasons = analyze_bio(inp.bio)
        reasons.extend([r for r in b_reasons if r.impact == "negative"][:2])

    return reasons[:6]
