"""Best-effort public scrapers for Instagram / X / Facebook.

These use public web endpoints / community mirrors that surface publicly
visible profile data (followers, following, posts, bio, etc.) — the same
information any logged-out browser would see.
"""
from __future__ import annotations
import re
import json
from urllib.parse import urlparse
import httpx
from schemas import FeatureInput, Platform, ScrapeResult


UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
COMMON_HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}


def detect_platform(url: str) -> Platform | None:
    host = urlparse(url).netloc.lower()
    if "instagram.com" in host: return "instagram"
    if "twitter.com" in host or "x.com" in host: return "twitter"
    if "facebook.com" in host or "fb.com" in host: return "facebook"
    return None


def extract_username(url: str, platform: Platform) -> str:
    path = urlparse(url).path.strip("/")
    if not path: return ""
    parts = path.split("/")
    if platform == "instagram":
        return parts[0]
    if platform == "twitter":
        if parts[0] in ("i", "search", "home", "explore", "notifications"): return ""
        return parts[0]
    if platform == "facebook":
        if parts[0] == "profile.php": return ""
        return parts[0]
    return ""


def _parse_num(s: str) -> int:
    """Parse '1.2M', '4,567', '23k', etc. into int."""
    if not s: return 0
    s = s.strip().replace(",", "").replace(" ", "")
    m = re.match(r"^([\d.]+)\s*([kKmMbB])?$", s)
    if not m: return 0
    val = float(m.group(1))
    suffix = (m.group(2) or "").lower()
    if   suffix == "k": val *= 1_000
    elif suffix == "m": val *= 1_000_000
    elif suffix == "b": val *= 1_000_000_000
    return int(val)


# =========================================================================
# INSTAGRAM
# =========================================================================
IG_HEADERS = {
    **COMMON_HEADERS,
    "X-IG-App-ID": "936619743392459",
    "Accept": "application/json",
    "Referer": "https://www.instagram.com/",
    "X-Requested-With": "XMLHttpRequest",
}


def _ig_from_web_profile_info(username: str) -> FeatureInput | None:
    """Instagram's own JSON endpoint (often rate-limited)."""
    url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
    r = httpx.get(url, headers=IG_HEADERS, timeout=8.0, follow_redirects=True)
    if r.status_code != 200:
        return None
    data = (r.json().get("data") or {}).get("user") or {}
    if not data:
        return None
    return FeatureInput(
        platform="instagram",
        username=data.get("username", username) or username,
        full_name=data.get("full_name") or "",
        bio=data.get("biography") or "",
        followers_count=int(((data.get("edge_followed_by") or {}).get("count")) or 0),
        following_count=int(((data.get("edge_follow") or {}).get("count")) or 0),
        posts_count=int(((data.get("edge_owner_to_timeline_media") or {}).get("count")) or 0),
        has_profile_pic=bool(data.get("profile_pic_url")),
        has_external_url=bool(data.get("external_url")),
        is_private=bool(data.get("is_private", False)),
    )


def _ig_from_profile_html(username: str) -> FeatureInput | None:
    """Parse OG meta tags from the public profile page."""
    r = httpx.get(f"https://www.instagram.com/{username}/", headers=COMMON_HEADERS,
                  timeout=8.0, follow_redirects=True)
    if r.status_code != 200:
        return None
    html = r.text
    desc_m = re.search(r'<meta\s+property="og:description"\s+content="([^"]+)"', html)
    if not desc_m:
        return None
    # IG og:description format: "1.2M Followers, 234 Following, 567 Posts - @user on Instagram: ..."
    desc = desc_m.group(1)
    fl = re.search(r'([\d.,KMB]+)\s*Followers', desc)
    fg = re.search(r'([\d.,KMB]+)\s*Following', desc)
    pp = re.search(r'([\d.,KMB]+)\s*Posts', desc)
    bio_m = re.search(r'on Instagram:\s*&quot;([^&]+)&quot;|on Instagram:\s*"([^"]+)"', desc)
    bio = ""
    if bio_m:
        bio = bio_m.group(1) or bio_m.group(2) or ""
    name_m = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', html)
    full_name = ""
    if name_m:
        title = name_m.group(1)
        nm = re.match(r"(.*?)\s*\(@", title)
        if nm: full_name = nm.group(1)
    private = "This Account is Private" in html or "isPrivate&quot;:true" in html
    has_url = "external_url&quot;:&quot;http" in html or "external_url\":\"http" in html
    return FeatureInput(
        platform="instagram",
        username=username,
        full_name=full_name,
        bio=bio,
        followers_count=_parse_num(fl.group(1)) if fl else 0,
        following_count=_parse_num(fg.group(1)) if fg else 0,
        posts_count=_parse_num(pp.group(1)) if pp else 0,
        has_profile_pic=True,
        has_external_url=has_url,
        is_private=private,
    )


def _ig_from_mirror(username: str) -> FeatureInput | None:
    """Public IG-viewer mirrors that proxy public profile data."""
    mirrors = [
        f"https://www.picnob.com/profile/{username}/",
        f"https://www.pixwox.com/profile/{username}/",   # often redirects to picnob
        f"https://www.picuki.com/profile/{username}",
        f"https://www.imginn.com/{username}/",
        f"https://greatfon.com/v/{username}",
    ]
    for url in mirrors:
        try:
            r = httpx.get(url, headers=COMMON_HEADERS, timeout=8.0, follow_redirects=True)
            if r.status_code != 200:
                continue
            html = r.text
            data = _parse_picnob_style(html, username)
            if data:
                return data
            # Generic fallback: look for meta description with stat phrases
            dm = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html)
            if dm:
                txt = dm.group(1)
                fl = re.search(r'([\d.,KMB]+)\s*Followers', txt)
                fg = re.search(r'([\d.,KMB]+)\s*Following', txt)
                pp = re.search(r'([\d.,KMB]+)\s*Posts', txt)
                if fl or pp:
                    bio_m = re.search(r'<meta\s+property="og:description"\s+content="([^"]+)"', html)
                    bio = bio_m.group(1) if bio_m else ""
                    return FeatureInput(
                        platform="instagram",
                        username=username, full_name="", bio=bio,
                        followers_count=_parse_num(fl.group(1)) if fl else 0,
                        following_count=_parse_num(fg.group(1)) if fg else 0,
                        posts_count=_parse_num(pp.group(1)) if pp else 0,
                        has_profile_pic=True, has_external_url=("http" in bio), is_private=False,
                    )
        except Exception:
            continue
    return None


def _parse_picnob_style(html: str, username: str) -> FeatureInput | None:
    """Parse picnob/pixwox HTML — those sites use a uniform `item_<stat>` block layout.

    Structure:
      <div class="item item_posts">    <div class="num" title="31,573">31.5k</div></div>
      <div class="item item_followers"><div class="num" title="269,598,551">269.5m</div></div>
      <div class="item item_following"><div class="num" title="193">193</div></div>
      <div class="sum">BIO_TEXT</div>
    """
    def find_stat(key: str) -> int:
        # Prefer the title attribute (raw number); fallback to inner text
        m = re.search(
            rf'<div class="item item_{key}">.*?<div class="num"\s+title="([^"]+)"',
            html, re.DOTALL,
        )
        if m:
            return _parse_num(m.group(1))
        m = re.search(
            rf'<div class="item item_{key}">.*?<div class="num"[^>]*>([^<]+)</div>',
            html, re.DOTALL,
        )
        return _parse_num(m.group(1)) if m else 0

    posts = find_stat("posts")
    followers = find_stat("followers")
    following = find_stat("following")
    if not (posts or followers or following):
        return None

    bio_m = re.search(r'<div class="sum">([^<]+)</div>', html)
    bio = bio_m.group(1).strip() if bio_m else ""
    name_m = re.search(r'<div class="fullname">([^<]+)</div>', html) or \
             re.search(r'<h1[^>]*class="username"[^>]*>([^<]+)</h1>', html)
    full_name = name_m.group(1).strip() if name_m else ""
    is_private = ("This Account is Private" in html or "is private" in html.lower()[:5000])
    return FeatureInput(
        platform="instagram",
        username=username,
        full_name=full_name,
        bio=bio,
        followers_count=followers,
        following_count=following,
        posts_count=posts,
        has_profile_pic=True,
        has_external_url=("http" in bio),
        is_private=is_private,
    )


def _ig_from_instaloader(username: str) -> FeatureInput | None:
    try:
        import instaloader
        L = instaloader.Instaloader(quiet=True, download_pictures=False, download_videos=False,
                                    download_video_thumbnails=False, download_geotags=False,
                                    download_comments=False, save_metadata=False)
        p = instaloader.Profile.from_username(L.context, username)
        return FeatureInput(
            platform="instagram",
            username=p.username, full_name=p.full_name or "", bio=p.biography or "",
            followers_count=p.followers, following_count=p.followees, posts_count=p.mediacount,
            has_profile_pic=bool(p.profile_pic_url), has_external_url=bool(p.external_url),
            is_private=p.is_private,
        )
    except Exception:
        return None


def scrape_instagram(username: str) -> FeatureInput:
    last_err: list[str] = []
    # Mirrors first — they're cached/proxied so they bypass our IP rate limit on IG.
    for name, fn in [
        ("mirrors",          _ig_from_mirror),
        ("web_profile_info", _ig_from_web_profile_info),
        ("profile_html",     _ig_from_profile_html),
        ("instaloader",      _ig_from_instaloader),
    ]:
        try:
            data = fn(username)
            if data and (data.followers_count or data.posts_count or data.bio):
                return data
            last_err.append(f"{name}: no data")
        except Exception as e:
            last_err.append(f"{name}: {type(e).__name__}")
    raise RuntimeError(
        f"All Instagram methods failed for @{username}. Profile may be private/deleted, or "
        f"all mirrors are currently down. Try again later or use Manual Analysis. "
        f"Details: {' | '.join(last_err)}"
    )


# =========================================================================
# TWITTER / X — uses api.fxtwitter.com (public mirror, reliable)
# =========================================================================
def scrape_twitter(username: str) -> FeatureInput:
    last_err: list[str] = []
    # Primary: fxtwitter — public clean JSON API used for embed previews
    for host in ["https://api.fxtwitter.com", "https://api.vxtwitter.com"]:
        try:
            r = httpx.get(f"{host}/{username}", timeout=8.0, follow_redirects=True, headers=COMMON_HEADERS)
            if r.status_code != 200:
                last_err.append(f"{host}: HTTP {r.status_code}")
                continue
            payload = r.json()
            u = payload.get("user") or payload.get("tweet", {}).get("author") or payload
            if not u or not u.get("screen_name"):
                last_err.append(f"{host}: empty payload")
                continue
            return FeatureInput(
                platform="twitter",
                username=u.get("screen_name", username),
                full_name=u.get("name") or "",
                bio=u.get("description") or "",
                followers_count=int(u.get("followers", 0) or 0),
                following_count=int(u.get("following", 0) or 0),
                posts_count=int(u.get("tweets", 0) or 0),
                has_profile_pic="default" not in (u.get("avatar_url") or u.get("profile_image_url_https") or ""),
                has_external_url=bool(u.get("website") or "http" in (u.get("description") or "")),
                is_private=bool(u.get("protected", False)),
            )
        except Exception as e:
            last_err.append(f"{host}: {type(e).__name__}")

    # Fallback: Nitter mirrors
    for host in ["https://nitter.net", "https://nitter.privacydev.net", "https://nitter.poast.org"]:
        try:
            r = httpx.get(f"{host}/{username}", timeout=6.0, follow_redirects=True, headers=COMMON_HEADERS)
            if r.status_code != 200 or "User not found" in r.text:
                continue
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, "html.parser")
            def num(sel: str) -> int:
                el = soup.select_one(sel)
                if not el: return 0
                m = re.search(r"\d+", el.get_text(strip=True).replace(",", "").replace(".", ""))
                return int(m.group()) if m else 0
            bio_el = soup.select_one(".profile-bio")
            bio = bio_el.get_text(strip=True) if bio_el else ""
            name_el = soup.select_one(".profile-card-fullname")
            return FeatureInput(
                platform="twitter",
                username=username,
                full_name=name_el.get_text(strip=True) if name_el else "",
                bio=bio,
                followers_count=num(".followers .profile-stat-num"),
                following_count=num(".following .profile-stat-num"),
                posts_count=num(".posts .profile-stat-num"),
                has_profile_pic=True,
                has_external_url=("http" in bio),
                is_private=False,
            )
        except Exception as e:
            last_err.append(f"{host}: {type(e).__name__}")

    raise RuntimeError(f"X/Twitter scrape failed for @{username}: {' | '.join(last_err)}")


# =========================================================================
# FACEBOOK
# =========================================================================
def scrape_facebook(username: str) -> FeatureInput:
    """Fetch a public FB Page/profile via the OpenGraph data that Facebook's
    own crawler exposes. We identify as `facebookexternalhit` (their preview bot),
    which gets a clean, language-friendly HTML response."""
    import html as html_mod
    last_err: list[str] = []

    fb_headers = {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        r = httpx.get(f"https://www.facebook.com/{username}", headers=fb_headers,
                      timeout=10.0, follow_redirects=True)
        if r.status_code == 200:
            html = r.text
            # og:title -> full name
            full_name = ""
            tm = re.search(r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"', html)
            if tm: full_name = html_mod.unescape(tm.group(1)).strip()
            # og:description -> stats + bio
            # Pattern: "NAME. N likes · N talking about this. BIO_TEXT"
            #          or "NAME. N likes · N following · N were here. BIO_TEXT"
            desc = ""
            dm = re.search(r'<meta[^>]+property="og:description"[^>]+content="([^"]+)"', html)
            if dm: desc = html_mod.unescape(dm.group(1))

            followers = following = 0
            bio = ""
            if desc:
                # Find all number-with-keyword pairs (English keywords thanks to Accept-Language en-US)
                lk = re.search(r'([\d,\.]+)\s*likes', desc, re.IGNORECASE)
                fl = re.search(r'([\d,\.]+)\s*followers', desc, re.IGNORECASE)
                tk = re.search(r'([\d,\.]+)\s*talking about', desc, re.IGNORECASE)
                # Map: likes (or explicit followers) -> followers_count;
                #      "talking about this" -> following_count (proxy engagement metric)
                followers = _parse_num((fl or lk).group(1)) if (fl or lk) else 0
                following = _parse_num(tk.group(1)) if tk else 0
                # Bio = trailing sentence after the last " · " section ends with "."
                # Split off the leading "NAME. STATS." prefix
                tail = re.split(r'\.\s+', desc, maxsplit=2)
                if len(tail) >= 3:
                    bio = tail[2].strip()
                elif len(tail) == 2:
                    bio = tail[1].strip()

            # Has external URL? Pages often list a website link in JSON-LD
            has_url = bool(re.search(r'"url":"https?://[^"]+","name":"Website"', html)) or ("http" in bio)
            # Private profiles rarely appear via FB crawler at all; if og:type is profile and minimal data, treat as private
            is_private = False
            ot = re.search(r'<meta[^>]+property="og:type"[^>]+content="([^"]+)"', html)
            og_type = ot.group(1) if ot else ""
            if og_type == "profile" and not (followers or following):
                is_private = True

            if followers or following or bio or full_name:
                return FeatureInput(
                    platform="facebook",
                    username=username,
                    full_name=full_name,
                    bio=bio,
                    followers_count=followers,
                    following_count=following,
                    posts_count=0,
                    has_profile_pic=True,
                    has_external_url=has_url,
                    is_private=is_private,
                )
        last_err.append(f"externalhit-bot: HTTP {r.status_code}")
    except Exception as e:
        last_err.append(f"externalhit-bot: {type(e).__name__}: {str(e)[:60]}")

    # Fallback: mbasic
    try:
        r = httpx.get(f"https://mbasic.facebook.com/{username}",
                      headers={**COMMON_HEADERS,
                               "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120 Mobile"},
                      timeout=8.0, follow_redirects=True)
        if r.status_code == 200 and "log in" not in r.text.lower()[:200]:
            html = r.text
            bm = re.search(r'<meta property="og:description" content="([^"]+)"', html)
            bio = bm.group(1) if bm else ""
            nm = re.search(r'<title>([^<]+)</title>', html)
            full_name = re.sub(r"\s*\|.*$", "", nm.group(1).strip()) if nm else ""
            if bio or full_name:
                return FeatureInput(
                    platform="facebook", username=username, full_name=full_name, bio=bio,
                    followers_count=0, following_count=0, posts_count=0,
                    has_profile_pic=True, has_external_url=("http" in bio), is_private=False,
                )
        last_err.append(f"mbasic: HTTP {r.status_code}")
    except Exception as e:
        last_err.append(f"mbasic: {type(e).__name__}")

    raise RuntimeError(f"Facebook scrape failed for @{username}: {' | '.join(last_err)}")


# =========================================================================
# Dispatcher
# =========================================================================
def scrape_url(url: str) -> ScrapeResult:
    platform = detect_platform(url)
    if not platform:
        return ScrapeResult(success=False, platform="instagram",
                            message="Unrecognized URL — must be instagram.com / x.com / facebook.com.")
    username = extract_username(url, platform)
    if not username:
        return ScrapeResult(success=False, platform=platform,
                            message=f"Could not extract a username from this {platform} URL.")
    try:
        if platform == "instagram":   data = scrape_instagram(username)
        elif platform == "twitter":   data = scrape_twitter(username)
        else:                         data = scrape_facebook(username)
        return ScrapeResult(success=True, platform=platform, extracted=data,
                            message=f"Fetched public profile for @{username}.")
    except Exception as e:
        return ScrapeResult(
            success=False, platform=platform,
            extracted=FeatureInput(platform=platform, username=username),
            message=f"Could not auto-fetch @{username}. {str(e)[:200]}",
        )
