from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import subprocess
import tempfile
import shutil
import os
import uuid
from rembg import remove
import logging

logger = logging.getLogger("skycally-api")
logging.basicConfig(level=logging.INFO)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


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
            logger.error("LibreOffice failed: %s", result.stderr.decode(errors='ignore')[:1000])
            raise HTTPException(
                status_code=500,
                detail="Document conversion failed. Please check your file and try again.",
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
        data = await _read_upload_limited(file)
        with open(input_path, "wb") as f:
            f.write(data)
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
        data = await _read_upload_limited(file)
        with open(input_path, "wb") as f:
            f.write(data)
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


# ─── REMOVE BACKGROUND ───────────────────────────────────────
@app.post("/api/remove-bg")
async def remove_bg(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    data = await _read_upload_limited(file)
    try:
        output = remove(data)
    except Exception as e:
        logger.exception("remove-bg failed: %s", e)
        raise HTTPException(status_code=500, detail="Background removal failed")
    return Response(
        content=output,
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="nobg.png"'},
    )