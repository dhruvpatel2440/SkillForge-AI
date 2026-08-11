import re


SECTION_KEYWORDS = {
    "summary": ["summary", "objective", "profile", "about"],
    "skills": ["skills", "technical skills", "technologies", "competencies", "tools"],
    "experience": ["experience", "work experience", "employment", "work history", "professional experience"],
    "education": ["education", "academic", "qualifications", "degrees"],
    "projects": ["projects", "personal projects", "academic projects", "portfolio"],
    "certifications": ["certifications", "certificates", "credentials", "licenses"],
    "achievements": ["achievements", "awards", "honors", "accomplishments"],
    "activities": ["activities", "extracurricular", "volunteering", "leadership"],
}


def detect_section(line: str) -> str | None:
    lower = line.lower().strip()
    for section, keywords in SECTION_KEYWORDS.items():
        if any(lower == kw or lower.startswith(kw) for kw in keywords):
            return section
    return None


def convert_to_markdown(raw_text: str) -> str:
    lines = raw_text.split("\n")
    md_lines = ["# Resume", ""]
    current_section = None
    buffer = []

    def flush_buffer():
        nonlocal buffer
        if buffer:
            for item in buffer:
                md_lines.append(item)
            buffer = []
            md_lines.append("")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Detect section headings
        section = detect_section(stripped)
        if section and len(stripped) < 60:
            flush_buffer()
            current_section = section
            md_lines.append(f"## {stripped.title()}")
            md_lines.append("")
            continue

        # Email detection
        if re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", stripped):
            buffer.append(stripped)
            continue

        # Bullet-like lines
        if stripped.startswith(("•", "-", "▪", "◦", "*", "·")):
            content = stripped.lstrip("•-▪◦*· ").strip()
            buffer.append(f"- {content}")
            continue

        # Lines that look like job titles or project names (short, no punctuation at end)
        if current_section in ("experience", "projects") and len(stripped) < 80 and not stripped.endswith((".", ",")):
            if not any(c.isdigit() for c in stripped[:3]):
                flush_buffer()
                md_lines.append(f"### {stripped}")
                md_lines.append("")
                continue

        buffer.append(stripped)

    flush_buffer()
    return "\n".join(md_lines)
