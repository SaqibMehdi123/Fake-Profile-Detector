"""Best-effort public scrapers for IG / X / FB.

All return a partially-filled FeatureInput on success, or raise.
Heavy try/except: if any scraper fails, the app falls back to manual entry,
prefilled with whatever we got.
"""
from __future__ import annotations
import re
from urllib.parse import urlparse
from schemas import FeatureInput, Platform, ScrapeResult


def detect_platform(url: str) -> Platform | None:
    host = urlparse(url).netloc.lower()
    if "instagram.com" in host:
        return "instagram"
    if "twitter.com" in host or "x.com" in host:
        return "twitter"
    if "facebook.com" in host or "fb.com" in host:
        return "facebook"
    return None


def extract_username(url: str, platform: Platform) -> str:
    path = urlparse(url).path.strip("/")
    if not path:
        return ""
    parts = path.split("/")
    if platform == "instagram":
        return parts[0]
    if platform == "twitter":
        # x.com/<user> or x.com/<user>/status/...
        if parts[0] in ("i", "search", "home"):
            return ""
        return parts[0]
    if platform == "facebook":
        # facebook.com/<user> or /profile.php?id=...
        if parts[0] == "profile.php":
            return ""
        return parts[0]
    return ""


def scrape_instagram(username: str) -> FeatureInput:
    import instaloader
    L = instaloader.Instaloader(quiet=True, download_pictures=False, download_videos=False,
                                download_video_thumbnails=False, download_geotags=False,
                                download_comments=False, save_metadata=False)
    profile = instaloader.Profile.from_username(L.context, username)
    return FeatureInput(
        platform="instagram",
        username=profile.username,
        full_name=profile.full_name or "",
        bio=profile.biography or "",
        followers_count=profile.followers,
        following_count=profile.followees,
        posts_count=profile.mediacount,
        has_profile_pic=bool(profile.profile_pic_url),
        has_external_url=bool(profile.external_url),
        is_private=profile.is_private,
    )


def scrape_twitter(username: str) -> FeatureInput:
    """X/Twitter no longer allows free scraping reliably.
    We try a public profile fetch via Nitter mirror as last-ditch best effort.
    Returns whatever we can get; many fields default."""
    import httpx
    from bs4 import BeautifulSoup

    nitter_hosts = [
        "https://nitter.net", "https://nitter.privacydev.net",
        "https://nitter.poast.org", "https://nitter.lucabased.xyz",
    ]
    last_err = None
    for host in nitter_hosts:
        try:
            r = httpx.get(f"{host}/{username}", timeout=8, follow_redirects=True,
                          headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200 or "User not found" in r.text:
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            def num(selector: str) -> int:
                el = soup.select_one(selector)
                if not el:
                    return 0
                txt = el.get_text(strip=True).replace(",", "").replace(".", "")
                m = re.search(r"\d+", txt)
                return int(m.group()) if m else 0

            followers = num(".followers .profile-stat-num")
            following = num(".following .profile-stat-num")
            posts = num(".posts .profile-stat-num")
            bio_el = soup.select_one(".profile-bio")
            bio = bio_el.get_text(strip=True) if bio_el else ""
            full_name_el = soup.select_one(".profile-card-fullname")
            full_name = full_name_el.get_text(strip=True) if full_name_el else ""
            avatar = soup.select_one(".profile-card-avatar img")
            has_pic = bool(avatar and "default" not in (avatar.get("src") or ""))

            return FeatureInput(
                platform="twitter",
                username=username,
                full_name=full_name,
                bio=bio,
                followers_count=followers,
                following_count=following,
                posts_count=posts,
                has_profile_pic=has_pic,
                has_external_url=("http" in bio),
                is_private=False,
            )
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Twitter/X scrape failed across all mirrors: {last_err}")


def scrape_facebook(username: str) -> FeatureInput:
    """Facebook is the most aggressively blocked. We do a best-effort public
    profile fetch and gracefully return mostly-empty data."""
    from facebook_scraper import get_profile
    try:
        prof = get_profile(username, timeout=10)
        return FeatureInput(
            platform="facebook",
            username=username,
            full_name=prof.get("Name", "") or "",
            bio=prof.get("About", "") or "",
            followers_count=int(prof.get("Followers", 0) or 0),
            following_count=int(prof.get("Following", 0) or 0),
            posts_count=0,
            has_profile_pic=True,
            has_external_url=False,
            is_private=False,
        )
    except Exception as e:
        raise RuntimeError(f"Facebook scrape failed: {e}")


def scrape_url(url: str) -> ScrapeResult:
    platform = detect_platform(url)
    if not platform:
        return ScrapeResult(success=False, platform="instagram",
                            message="Unrecognized URL — must be an instagram.com / x.com / facebook.com profile link.")
    username = extract_username(url, platform)
    if not username:
        return ScrapeResult(success=False, platform=platform,
                            message=f"Could not extract a username from this {platform} URL.")
    try:
        if platform == "instagram":
            data = scrape_instagram(username)
        elif platform == "twitter":
            data = scrape_twitter(username)
        else:
            data = scrape_facebook(username)
        return ScrapeResult(success=True, platform=platform, extracted=data,
                            message=f"Extracted public profile data for @{username}.")
    except Exception as e:
        # Soft failure: return platform + username so the app can prefill manual form
        return ScrapeResult(
            success=False, platform=platform,
            extracted=FeatureInput(platform=platform, username=username),
            message=f"Could not auto-fetch (@{username}). The platform likely blocked the request — please fill the fields manually. (details: {type(e).__name__})",
        )
