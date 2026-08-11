import hashlib
import io
import logging
from pathlib import Path
import fitz  # PyMuPDF
import pdfplumber

logger = logging.getLogger(__name__)


def calculate_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def extract_text_pymupdf(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n".join(pages)


def extract_text_pdfplumber(content: bytes) -> str:
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        pages = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n".join(pages)


def extract_text(content: bytes) -> str:
    try:
        text = extract_text_pymupdf(content)
        if text and len(text.strip()) > 100:
            return clean_text(text)
    except Exception as e:
        logger.warning(f"PyMuPDF extraction failed: {e}, trying pdfplumber")

    try:
        text = extract_text_pdfplumber(content)
        if text and len(text.strip()) > 100:
            return clean_text(text)
    except Exception as e:
        logger.error(f"pdfplumber extraction also failed: {e}")

    raise ValueError("Unable to extract readable text from this PDF.")


def clean_text(text: str) -> str:
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        line = line.strip()
        if line:
            cleaned.append(line)
    return "\n".join(cleaned)
