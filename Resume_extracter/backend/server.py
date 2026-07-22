"""Clarifuse's local resume-extraction API.

Run from the project root with: python -m uvicorn backend.server:app --reload
"""
from __future__ import annotations

import io
import re
from collections import OrderedDict
from pathlib import Path

from docx import Document
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PyPDF2 import PdfReader

ROOT = Path(__file__).parent.parent
FRONTEND = ROOT / "frontend" / "dist"
app = FastAPI(title="Clarifuse Resume Extraction")
app.mount("/assets", StaticFiles(directory=FRONTEND / "assets"), name="assets")

SIGNALS = OrderedDict({
    "skills": ["python", "java", "c++", "c#", "javascript", "typescript", "sql", "html", "css", "machine learning", "deep learning", "data analysis", "data structures", "algorithms", "problem solving", "communication", "leadership"],
    "technologies": ["pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "react", "node.js", "express", "fastapi", "django", "flask", "docker", "git", "github", "aws", "azure", "mongodb", "postgresql", "mysql", "power bi", "tableau", "figma"],
    "certifications": ["certified", "certification", "certificate", "coursera", "udemy", "nptel", "google cloud", "aws certified", "microsoft certified"],
    "leadership": ["lead", "leadership", "president", "vice president", "coordinator", "organizer", "mentor", "club", "society"],
})

def extract_pdf(data: bytes) -> str:
    return "\n".join((page.extract_text() or "") for page in PdfReader(io.BytesIO(data)).pages)

def extract_docx(data: bytes) -> str:
    document = Document(io.BytesIO(data))
    paragraphs = [p.text for p in document.paragraphs]
    tables = [" | ".join(cell.text for cell in row.cells) for table in document.tables for row in table.rows]
    return "\n".join(paragraphs + tables)

def unique_matches(text: str, terms: list[str]) -> list[str]:
    found = []
    for term in terms:
        if re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", text, re.I):
            found.append(term.title() if term not in {"c++", "c#", "sql", "html", "css", "aws"} else term.upper())
    return found

SECTION_HEADINGS = {
    "projects": {"projects", "project", "project experience", "academic projects", "personal projects", "key projects", "research projects"},
    "experience": {"experience", "work experience", "professional experience", "internship", "internships", "employment history", "work history"},
    "leadership": {"leadership", "leadership experience", "positions of responsibility", "extracurricular activities", "activities", "volunteering", "volunteer experience", "leadership activities"},
    "stop": {"education", "skills", "technical skills", "certifications", "achievements", "summary", "profile", "interests", "languages", "publications", "references", "contact"},
}

def clean_lines(text: str) -> list[str]:
    return [re.sub(r"\s+", " ", line).strip(" -•▪◦\t") for line in text.splitlines() if line.strip()]

def heading_key(line: str) -> str | None:
    normalized = re.sub(r"[^a-z ]", "", line.lower()).strip()
    # PDF text extraction commonly turns a visual heading into `P R O J E C T S`.
    # Compare a compact form so both that layout and normal headings are recognised.
    compact = normalized.replace(" ", "")
    heading_like = len(normalized) <= 55 and len(line.split()) <= 7
    for key, headings in SECTION_HEADINGS.items():
        compact_headings = {heading.replace(" ", "") for heading in headings}
        if compact in compact_headings or normalized in headings or (heading_like and any(heading in normalized for heading in headings)):
            return key
    return None

def merge_wrapped_entries(entries: list[str]) -> list[str]:
    """Rejoin PDF line wraps while retaining titles and bullet points as entries."""
    merged = []
    continuation_words = ("and ", "or ", "with ", "for ", "to ", "in ", "on ", "of ", "the ", "a ", "an ", "supporting ", "enabling ", "improving ", "including ", "between ", "recruiters,", "image ", "backend ", "development ", "entity ")
    for entry in entries:
        lower = entry.lower()
        is_bullet = entry.startswith(("–", "-", "•"))
        should_join = merged and not is_bullet and (lower.startswith(continuation_words) or merged[-1].rstrip().endswith((",", "-")))
        if should_join:
            merged[-1] = f"{merged[-1]} {entry}"
        else:
            merged.append(entry)
    return merged

def section_lines(text: str, section: str, limit: int = 60) -> list[str]:
    """Extract useful entries beneath a resume heading without discarding short headings."""
    lines = clean_lines(text)
    entries, collecting, profile_wrap = [], False, False
    for line in lines:
        key = heading_key(line)
        if key == section:
            collecting = True
            continue
        if collecting and key is not None:
            break
        if collecting and re.search(r"(?:https?://|www\.|github\.com|linkedin\.com)", line, re.I):
            profile_wrap = line.rstrip().endswith("/")
            continue
        if collecting and profile_wrap:
            profile_wrap = False
            continue
        if collecting and len(line) >= 3:
            entries.append(line[:180])
            if len(entries) >= 100:
                break
    if entries:
        return list(dict.fromkeys(merge_wrapped_entries(entries)))[:limit]

    # Some PDF layouts flatten headings and descriptions onto the same line.
    pattern = r"(?:projects?|project experience)\s*[:\-–]?\s*(.{15,180})"
    if section == "projects":
        matches = re.findall(pattern, re.sub(r"\s+", " ", text), re.I)
        return [match.strip(" -•") for match in matches[:limit]]
    return []

def profile_link(text: str, domain: str) -> str | None:
    """Find profile links even when a resume omits the URL scheme."""
    # Capture one contact-field at a time, then remove PDF-introduced spaces
    # within it (for example: `linkedin.com/in/harsh -mangal2806`).
    field_match = re.search(rf"(?:https?://)?(?:www\.)?{re.escape(domain)}/[^|\r\n]+", text, re.I)
    url_text = re.sub(r"\s+", "", field_match.group(0)) if field_match else text
    pattern = rf"(?:https?://)?(?:www\.)?{re.escape(domain)}/[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]+"
    match = re.search(pattern, url_text, re.I)
    if not match:
        return None
    link = match.group(0).rstrip(".);]")
    return link if link.lower().startswith("http") else f"https://{link}"

def leadership_items(text: str) -> list[str]:
    entries = section_lines(text, "leadership")
    if entries:
        return entries
    role_pattern = r"\b(president|vice president|secretary|coordinator|lead|team lead|organizer|mentor|volunteer|ambassador|captain|founder)\b"
    candidates = [line[:180] for line in clean_lines(text) if re.search(role_pattern, line, re.I)]
    return list(dict.fromkeys(candidates))[:3]

def is_bullet(line: str) -> bool:
    return line.lstrip().startswith(("–", "-", "•"))

def is_technology_line(line: str) -> bool:
    indicators = ("python", "react", "fastapi", "java", "docker", "firebase", "tensorflow", "streamlit", "sql", "aws", "opencv", "yolov")
    lowered = line.lower()
    return "," in line and any(indicator in lowered for indicator in indicators)

def project_records(lines: list[str]) -> list[dict]:
    records, current = [], None
    for index, line in enumerate(lines):
        following = lines[index + 1] if index + 1 < len(lines) else ""
        if not is_bullet(line) and not is_bullet(following) and is_technology_line(following):
            if current:
                records.append(current)
            current = {"title": line, "technologies": following, "highlights": []}
        elif current and is_bullet(line):
            current["highlights"].append(line.lstrip("–-• "))
        elif current and not is_technology_line(line):
            # A continuation line caused by PDF wrapping belongs to the last bullet.
            if current["highlights"]:
                current["highlights"][-1] += f" {line}"
    if current:
        records.append(current)
    return records

def experience_records(lines: list[str]) -> list[dict]:
    records, current = [], None
    date_pattern = r"(?:19|20)\d{2}.*(?:19|20)\d{2}|present"
    for line in lines:
        is_role = not is_bullet(line) and ("—" in line or re.search(date_pattern, line, re.I))
        if is_role:
            if current:
                records.append(current)
            current = {"role": line, "location": "", "highlights": []}
        elif current and is_bullet(line):
            current["highlights"].append(line.lstrip("–-• "))
        elif current and line and not current["highlights"]:
            current["location"] = line
        elif current and current["highlights"]:
            current["highlights"][-1] += f" {line}"
    if current:
        records.append(current)
    return records

def analyze(text: str) -> dict:
    clean = re.sub(r"\s+", " ", text).strip()
    projects = section_lines(text, "projects")
    experience = section_lines(text, "experience")
    return {
        "word_count": len(clean.split()),
        "skills": unique_matches(clean, SIGNALS["skills"]),
        "technologies": unique_matches(clean, SIGNALS["technologies"]),
        "projects": projects,
        "experience": experience,
        "project_details": project_records(projects),
        "experience_details": experience_records(experience),
        "certifications": unique_matches(clean, SIGNALS["certifications"]),
        "github": profile_link(text, "github.com"),
        "linkedin": profile_link(text, "linkedin.com"),
        "internship_experience": bool(re.search(r"\bintern(ship|ed)?\b", clean, re.I)),
        "leadership": leadership_items(text),
        "preview": clean[:500],
    }

@app.get("/")
def index():
    return FileResponse(FRONTEND / "index.html")

@app.post("/api/resumes/extract")
async def extract_resume(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".doc", ".docx"}:
        raise HTTPException(415, "Please upload a PDF or DOCX resume.")
    if suffix == ".doc":
        raise HTTPException(415, "Legacy .doc files are not supported yet. Please save it as DOCX or PDF.")
    data = await file.read()
    if not data or len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Use a non-empty resume smaller than 10 MB.")
    try:
        text = extract_pdf(data) if suffix == ".pdf" else extract_docx(data)
    except Exception as exc:
        raise HTTPException(422, "We couldn't read this file. Try exporting it as a text-based PDF or DOCX.") from exc
    if len(text.strip()) < 30:
        raise HTTPException(422, "We couldn't find readable text in this resume.")
    return {"file_name": file.filename, "extraction": analyze(text)}
