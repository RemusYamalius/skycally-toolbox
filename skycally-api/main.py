from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import yt_dlp
import subprocess
import tempfile
import shutil
import os
import uuid
import ipaddress
import socket
import logging
from urllib.parse import urlparse

logger = logging.getLogger("skycally-api")
logging.basicConfig(level=logging.INFO)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB

ALLOWED_VIDEO_HOSTS = {
    "youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com",
    "tiktok.com", "vm.tiktok.com", "vt.tiktok.com",
    "instagram.com", "www.instagram.com",
    "twitter.com", "x.com", "mobile.twitter.com",
    "facebook.com", "www.facebook.com", "fb.watch", "m.facebook.com",
    "vimeo.com", "www.vimeo.com",
    "reddit.com", "www.reddit.com", "v.redd.it",
    "twitch.tv", "www.twitch.tv", "clips.twitch.tv",
    "dailymotion.com", "www.dailymotion.com",
    "soundcloud.com", "www.soundcloud.com",
    "snapchat.com", "www.snapchat.com",
    "pinterest.com", "www.pinterest.com",
    "linkedin.com", "www.linkedin.com",
}


def _validate_video_url(url: str) -> None:
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL")
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only http(s) URLs are allowed")
    host = (parsed.hostname or "").lower()
    if not host:
        raise HTTPException(status_code=400, detail="Invalid URL")
    # Allowlist host or any subdomain of allowlisted host
    if not any(host == h or host.endswith("." + h) for h in ALLOWED_VIDEO_HOSTS):
        raise HTTPException(status_code=400, detail="Unsupported platform")
    # Reject private/reserved IPs (defense in depth)
    try:
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                raise HTTPException(status_code=400, detail="Disallowed host")
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve host")


async def _read_upload_limited(file: UploadFile) -> bytes:
    chunks = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024*1024)}MB limit")
        chunks.append(chunk)
    return b"".join(chunks)

app = FastAPI(title="skycally-api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://skycally.com",
        "https://www.skycally.com",
        "https://skycally-toolbox.lovable.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.lovable\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── HEALTH ──────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "skycally-api"}


# ─── VIDEO DOWNLOADER ────────────────────────────────────────
@app.get("/api/video-info")
async def video_info(url: str):
    _validate_video_url(url)
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            seen = set()
            for f in info.get("formats", []):
                quality = f.get("format_note") or f.get("height")
                if not quality or not f.get("url"):
                    continue
                key = str(quality)
                if key in seen:
                    continue
                seen.add(key)
                size = f.get("filesize") or f.get("filesize_approx")
                size_str = None
                if size:
                    mb = size / (1024 * 1024)
                    size_str = f"{mb:.1f} MB"
                formats.append({
                    "quality": str(quality),
                    "url": f.get("url"),
                    "ext": f.get("ext", "mp4"),
                    "size": size_str,
                })
            return {
                "title": info.get("title", "Video"),
                "thumbnail": info.get("thumbnail", ""),
                "formats": formats[-8:],
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("video_info failed: %s", e)
        msg = str(e).lower()
        if "unsupported" in msg or "private" in msg:
            raise HTTPException(status_code=400, detail="Unsupported platform or private video")
        if "network" in msg or "timed out" in msg or "connection" in msg:
            raise HTTPException(status_code=502, detail="Could not reach the video platform")
        raise HTTPException(status_code=400, detail="Video info unavailable")


def _libreoffice_convert(input_path: str, out_dir: str, target: str):
    """Run LibreOffice with isolated user profile to allow concurrent calls."""
    profile_dir = tempfile.mkdtemp(prefix="lo-profile-")
    try:
        result = subprocess.run(
            [
                "libreoffice",
                f"-env:UserInstallation=file://{profile_dir}",
                "--headless",
                "--convert-to",
                target,
                "--outdir",
                out_dir,
                input_path,
            ],
            capture_output=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"LibreOffice failed: {result.stderr.decode(errors='ignore')[:500]}",
            )
    finally:
        shutil.rmtree(profile_dir, ignore_errors=True)


# ─── WORD TO PDF ─────────────────────────────────────────────
@app.post("/api/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".doc", ".docx")):
        raise HTTPException(status_code=400, detail="Only .doc/.docx files allowed")

    tmp_dir = tempfile.mkdtemp(prefix="w2p-")
    try:
        safe_name = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
        input_path = os.path.join(tmp_dir, safe_name)
        with open(input_path, "wb") as f:
            f.write(await file.read())

        _libreoffice_convert(input_path, tmp_dir, "pdf")

        pdf_filename = os.path.splitext(safe_name)[0] + ".pdf"
        pdf_path = os.path.join(tmp_dir, pdf_filename)
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="PDF output not produced")

        with open(pdf_path, "rb") as f:
            content = f.read()

        download_name = os.path.splitext(file.filename)[0] + ".pdf"
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ─── PDF TO WORD ─────────────────────────────────────────────
@app.post("/api/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files allowed")

    tmp_dir = tempfile.mkdtemp(prefix="p2w-")
    try:
        safe_name = f"{uuid.uuid4().hex}_{os.path.basename(file.filename)}"
        input_path = os.path.join(tmp_dir, safe_name)
        with open(input_path, "wb") as f:
            f.write(await file.read())

        _libreoffice_convert(input_path, tmp_dir, "docx")

        docx_filename = os.path.splitext(safe_name)[0] + ".docx"
        docx_path = os.path.join(tmp_dir, docx_filename)
        if not os.path.exists(docx_path):
            raise HTTPException(status_code=500, detail="DOCX output not produced")

        with open(docx_path, "rb") as f:
            content = f.read()

        download_name = os.path.splitext(file.filename)[0] + ".docx"
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


