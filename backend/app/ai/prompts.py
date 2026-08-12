SYSTEM_JSON = (
    "You are a strict, evidence-only technical recruiter and career coach. "
    "Your job is to be ACCURATE, not kind. Never inflate scores. Never assume skills the resume does not prove. "
    "A skill listed in a skills section with NO project or experience backing is a CLAIM, not a demonstrated skill. "
    "Treat claims skeptically. Only reward what the resume actually proves with concrete context. "
    "You MUST respond with valid JSON only. No explanations outside JSON. No markdown fences. Pure JSON."
)

RESUME_EXTRACTION_PROMPT = """
Analyze the resume below. Extract ONLY what is explicitly stated. Do NOT infer, assume, or add skills not mentioned.

Resume:
{markdown}

---
EXTRACTION RULES (follow strictly):

SKILL CLASSIFICATION:
- CLAIMED: skill appears only in a "Skills" or "Technologies" list with no project/experience context → confidence 0.2-0.45
- TOUCHED: skill appears in a project/experience description vaguely (e.g. "used Python") → confidence 0.45-0.60
- DEMONSTRATED: skill appears with a specific project outcome, feature built, or measurable result → confidence 0.60-0.80
- PROVEN: skill appears across multiple projects OR with quantified results (e.g. "reduced latency 40%") → confidence 0.80-1.0

PROFICIENCY MAPPING:
- beginner: CLAIMED or TOUCHED skills, no depth shown, <1 year implied
- intermediate: DEMONSTRATED in 1-2 projects, clear usage context
- advanced: PROVEN across multiple contexts, measurable outcomes, or leadership/architectural decisions

CONFIDENCE SCORING (be conservative, err low not high):
- Self-listed skill section only: 0.2-0.4
- Mentioned once in a project with no detail: 0.4-0.55
- Core technology in a project with some description: 0.55-0.70
- Multiple projects + described outcomes: 0.70-0.85
- Years of experience documented + measurable results: 0.85-1.0

EVIDENCE: Quote the EXACT phrase or sentence from the resume that proves this skill.
If you cannot find a direct quote, the evidence_strength is "weak" and you must use confidence ≤ 0.45.

Return this exact JSON:
{{
  "candidate": {{
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "summary": "",
    "total_experience_years": 0.0
  }},
  "skills": [
    {{
      "name": "exact skill name as it appears in resume",
      "category": "Web Development|Backend|Data Science|DevOps|Mobile|Database|Security|AI/ML|Other",
      "proficiency": "beginner|intermediate|advanced",
      "classification": "claimed|touched|demonstrated|proven",
      "confidence": 0.0,
      "years_estimated": 0.0,
      "evidence": "EXACT quote from resume (copy-paste, not paraphrase)",
      "evidence_source": "Skills section|Projects|Experience|Education|Certifications",
      "evidence_strength": "strong|moderate|weak"
    }}
  ],
  "projects": [
    {{
      "name": "",
      "description": "",
      "technologies": [],
      "role": "",
      "outcome": "quantified or specific result if mentioned, else empty string",
      "evidence": "key line from resume proving this project"
    }}
  ],
  "experience": [
    {{
      "company": "",
      "role": "",
      "start_date": "",
      "end_date": "",
      "duration_months": 0,
      "description": "",
      "technologies": [],
      "achievements": ["quantified achievement if any"]
    }}
  ],
  "education": [
    {{
      "institution": "",
      "degree": "",
      "field": "",
      "start_date": "",
      "end_date": "",
      "gpa": ""
    }}
  ],
  "certifications": [
    {{
      "name": "",
      "issuer": "",
      "date": ""
    }}
  ],
  "achievements": ["only include if measurable/specific — not generic statements"],
  "red_flags": [
    "List any inconsistencies, date gaps > 6 months, skills listed but never used in any project, or suspicious claims"
  ]
}}

ANTI-INFLATION RULES (strictly enforce):
1. Do NOT list a skill if the ONLY evidence is that it appears in a generic skills list.
   Instead mark it classification="claimed", confidence≤0.40, evidence_strength="weak".
2. Do NOT give "advanced" proficiency unless there is multi-project evidence with outcomes.
3. Do NOT round confidence up. Be conservative.
4. red_flags MUST include any skill listed in "Skills" section that appears in ZERO projects and ZERO experience descriptions.
"""

GAP_ANALYSIS_PROMPT = """
Perform a precise, evidence-based skill gap analysis. Be strict. Do not inflate the readiness score.

---
CANDIDATE RESUME:
{markdown}

EXTRACTED SKILLS (with classification and confidence):
{skills_json}

PROJECTS:
{projects_json}

EXPERIENCE:
{experience_json}

TARGET ROLE: {target_role}
TIMELINE: {timeline_months} months
WEEKLY HOURS: {weekly_hours}

---
ANALYSIS PROTOCOL (follow in order):

STEP 1 — ESTABLISH ROLE REQUIREMENTS:
List the must-have, should-have, and nice-to-have skills for {target_role} based on industry-standard job descriptions.
Classify each as: critical (blocks hiring without it) | important (expected) | bonus (differentiator)

STEP 2 — MATCH CANDIDATE AGAINST REQUIREMENTS:
For each required skill, find the BEST matching candidate skill (if any).
Only count a skill as "covered" if its classification is "demonstrated" or "proven".
Skills classified as "claimed" or "touched" count as PARTIALLY covered (50% credit at most).

STEP 3 — SCORE CALCULATION (do not deviate from this formula):
- technical_skills (max 35): sum of (skill_weight × coverage_fraction) for each required skill
  - critical skill covered (demonstrated/proven): full points
  - critical skill partially covered (claimed/touched): 50% of points
  - critical skill missing: 0 points
- projects_evidence (max 25): relevance and depth of projects to target role
  - Each directly relevant project with outcomes: 6-8 points
  - Each tangentially relevant project: 2-4 points
  - Generic/tutorial projects: 0-1 point
- experience (max 15): work experience relevance and total months
  - Directly relevant role experience: up to 15 points
  - Adjacent field experience: up to 8 points
  - No professional experience: 0 points
- role_requirements (max 15): % of critical+important requirements covered (demonstrated/proven only)
  - Multiply 15 × (covered_critical / total_critical)
- certifications_achievements (max 10): relevant certifications + measurable achievements
  - Each role-relevant certification: 3-4 points
  - Each quantified achievement: 1-2 points

STEP 4 — ANTI-INFLATION CHECK:
If readiness_score > 70 but candidate has critical skills only "claimed" (not demonstrated), reduce score by 10-15.
If candidate has <2 relevant projects, cap projects_evidence at 10.
If no professional experience, cap experience at 3.

Return this exact JSON:
{{
  "readiness_score": 0,
  "score_breakdown": {{
    "technical_skills": 0,
    "projects_evidence": 0,
    "experience": 0,
    "role_requirements": 0,
    "certifications_achievements": 0
  }},
  "role_requirements_map": {{
    "critical": [
      {{
        "skill": "",
        "candidate_coverage": "none|claimed|touched|demonstrated|proven",
        "coverage_score": 0.0,
        "notes": ""
      }}
    ],
    "important": [
      {{
        "skill": "",
        "candidate_coverage": "none|claimed|touched|demonstrated|proven",
        "coverage_score": 0.0,
        "notes": ""
      }}
    ],
    "bonus": [
      {{
        "skill": "",
        "candidate_coverage": "none|claimed|touched|demonstrated|proven",
        "coverage_score": 0.0,
        "notes": ""
      }}
    ]
  }},
  "strengths": [
    {{
      "skill": "",
      "level": "beginner|intermediate|advanced",
      "evidence": "exact quote from resume proving this strength",
      "demand_in_role": 0.0,
      "classification": "demonstrated|proven"
    }}
  ],
  "weak_skills": [
    {{
      "skill": "",
      "issue": "claimed but not demonstrated in any project or experience",
      "resume_location": "where it appears (e.g. Skills section)",
      "recommendation": "what project or task would prove this skill"
    }}
  ],
  "missing_skills": [
    {{
      "skill": "",
      "current_level": "none|beginner|intermediate",
      "target_level": "intermediate|advanced",
      "gap_size": 0,
      "priority": "critical|high|medium|low",
      "reason": "why this specific skill is needed for {target_role}",
      "demand_frequency": 0.0,
      "time_to_learn_weeks": 0,
      "recommended_action": "specific, actionable step (e.g. 'Build a REST API with authentication using FastAPI')"
    }}
  ],
  "project_gaps": [
    {{
      "skill": "skill that needs project evidence",
      "suggested_project": "concrete mini-project idea to prove this skill"
    }}
  ],
  "experience_gaps": ["specific type of practical exposure missing"],
  "honest_assessment": "2-3 sentence honest assessment of where the candidate actually stands for {target_role}. No sugarcoating.",
  "recommendations": [
    "Top 5 specific, ordered-by-impact actions the candidate should take NOW"
  ]
}}

SCORING RULES (non-negotiable):
- A candidate who lists 10 skills but demonstrates 0 in projects should score 20-35, not 60+.
- Only strengths with classification "demonstrated" or "proven" count as real strengths.
- missing_skills must include ALL critical role requirements not demonstrated (not just a few).
- gap_size: 0=no gap, 100=completely missing. Be honest: if they listed the skill but never used it, gap_size should be 60-75.
- demand_frequency: based on how often this skill appears in real job postings for {target_role} (0=rare, 1=every job posting).
"""

PROJECT_RECOMMENDATIONS_PROMPT = """
Generate personalized project recommendations for this candidate.

TARGET ROLE: {target_role}
TIMELINE: {timeline_months} months, {weekly_hours} hrs/week

MISSING SKILLS (from gap analysis):
{missing_skills_json}

WEAK/UNPROVEN SKILLS (listed but no project backing):
{weak_skills_json}

CANDIDATE'S EXISTING STRONG SKILLS:
{strong_skills_json}

CANDIDATE'S EXISTING PROJECTS (do NOT repeat these):
{existing_projects_json}

---
Generate exactly 5 project recommendations. Each project must:
1. Close at least 2 of the candidate's missing/weak skills
2. Build on skills they already have (so it's achievable, not starting from zero)
3. Be scoped to their weekly hours: {weekly_hours} hrs/week
4. Be something that can go on a GitHub portfolio and impress an interviewer for {target_role}

Project types to include (use exactly these labels):
- 1 FLAGSHIP: large, 4-6 week project covering the most critical gaps
- 1 INFRASTRUCTURE: deployment/DevOps/tooling project (2-4 weeks)
- 2 DEPTH: focused single-skill deep-dive projects (1-3 weeks each)
- 1 STARTER: quick win to close an easy gap (< 1 week, <10 hrs total)

Return a JSON array of exactly 5 objects:
[
  {{
    "id": "proj_1",
    "title": "concise project name",
    "type": "flagship|infrastructure|depth|starter",
    "type_label": "FLAGSHIP|INFRASTRUCTURE|DEPTH|STARTER",
    "duration_weeks_min": 1,
    "duration_weeks_max": 6,
    "description": "2-3 sentence description of what to build and why it proves the skills. Be concrete.",
    "technologies": ["tech1", "tech2"],
    "closes_gaps": ["exact skill name from missing_skills or weak_skills"],
    "gap_count_closed": 3,
    "learning_outcomes": ["Can build X", "Understands Y", "Deployed Z"],
    "estimated_hours": 40,
    "difficulty": "beginner|intermediate|advanced",
    "repo_structure_hint": "one-line hint on how to structure the repo (e.g. monorepo, REST API + React frontend, CLI tool)"
  }}
]

RULES:
- closes_gaps must contain EXACT skill names from the missing/weak skill lists — do NOT invent new skill names
- technologies must include skills the candidate is MISSING (that's the point) + some they know
- estimated_hours must fit within the duration × weekly_hours
- Do NOT repeat any project the candidate already has
- Description must be specific — not generic ("build a CRUD app"), but detailed ("Build a job-board API with JWT auth, rate limiting, and a PostgreSQL schema — then deploy it to Railway with a CI/CD pipeline")
"""

ROADMAP_PROMPT = """
Generate a personalized week-by-week learning roadmap.

Target role: {target_role}
Timeline: {timeline_months} months ({duration_weeks} weeks)
Weekly hours: {weekly_hours}

Gap analysis:
{gap_analysis_json}

Current skills (strong evidence):
{strong_skills}

Missing/weak skills to address:
{gaps_to_address}

Return a JSON array of week objects. Each week:
{{
  "week": 1,
  "phase": "foundation|intermediate|advanced",
  "title": "concise title",
  "objective": "what the learner will achieve this week",
  "skills": ["skill1", "skill2"],
  "estimated_hours": {weekly_hours},
  "tasks": [
    {{
      "title": "task title",
      "description": "specific description",
      "task_type": "learning|project|practice|reading|quiz|checkpoint",
      "estimated_hours": 2.0
    }}
  ],
  "checklist": [
    "Specific verifiable item 1",
    "Specific verifiable item 2"
  ],
  "completion_criteria": [
    "Can demonstrate X",
    "Has built Y"
  ],
  "mini_project": {{
    "title": "project title",
    "brief": "concise project brief (2-3 sentences)",
    "kicker": "phase · skill focus"
  }}
}}

Phase rules:
- Foundation (first 30-40% of weeks): missing fundamentals, core concepts
- Intermediate (middle 40-50%): role-specific practical skills, real projects
- Advanced (last 20-30%): production concepts, deployment, interview prep

Order weeks by: gap_size × market_demand × prerequisite_readiness
Put prerequisite skills before dependent ones.
"""

RESOURCE_PROMPT = """
Recommend learning resources for this roadmap week.

Week title: {week_title}
Week objective: {objective}
Skills to learn: {skills}
Learner phase: {phase}
Estimated hours this week: {estimated_hours}

Return a JSON array of resource objects:
[
  {{
    "title": "resource title",
    "provider": "provider name",
    "url": "https://...",
    "resource_type": "course|documentation|tutorial|project|practice",
    "difficulty": "beginner|intermediate|advanced",
    "estimated_hours": 2.0,
    "reason": "why this resource for this learner at this stage"
  }}
]

Rules:
- Only include real, well-known resources (official docs, reputable platforms)
- Prefer free resources: official docs, freeCodeCamp, MDN, Python.org, react.dev, fastapi.tiangolo.com
- Paid resources: only if clearly labeled and worth the cost
- Maximum 4-5 resources per week
- Match difficulty to learner's current level and phase
- DO NOT invent URLs — use only well-known resource URLs you are confident exist
"""

QUIZ_PROMPT = """
Generate a 5-question quiz for this learning week.

Week title: {week_title}
Week objective: {objective}
Skills covered: {skills}
Content summary: {content_summary}

Return a JSON array of question objects:
[
  {{
    "n": 1,
    "text": "question text",
    "type": "mcq|conceptual|scenario|practical",
    "options": [
      "option A",
      "option B",
      "option C",
      "option D"
    ],
    "correct": 0,
    "explanation": "why this answer is correct"
  }}
]

Rules:
- Mix: 2 MCQ, 1 conceptual, 1 scenario-based, 1 practical reasoning
- Questions must be directly about the week's content
- Distractors must be plausible (not obviously wrong)
- correct is the 0-based index of the right option
- No trick questions; test genuine understanding
"""

INTERVIEW_PROMPT = """
Generate interview questions for a candidate targeting {target_role}.

Resume highlights:
{resume_summary}

Projects:
{projects_json}

Skills (strong evidence):
{strong_skills}

Skill gaps (partially closed):
{gaps}

Generate questions in each category. Return JSON:
{{
  "technical": [
    {{
      "question": "",
      "difficulty": "easy|medium|hard",
      "answer_guidance": "key points a good answer covers",
      "category": "technical"
    }}
  ],
  "project": [
    {{
      "question": "question specifically about one of their projects",
      "difficulty": "medium",
      "answer_guidance": "",
      "category": "project"
    }}
  ],
  "behavioral": [
    {{
      "question": "STAR-format behavioral question",
      "difficulty": "easy",
      "answer_guidance": "",
      "category": "behavioral"
    }}
  ],
  "scenario": [
    {{
      "question": "real-world engineering scenario",
      "difficulty": "hard",
      "answer_guidance": "",
      "category": "scenario"
    }}
  ],
  "resume": [
    {{
      "question": "question directly referencing resume content",
      "difficulty": "medium",
      "answer_guidance": "",
      "category": "resume"
    }}
  ]
}}

Generate 3-4 questions per category. Make project questions specific to their actual projects.
"""

INTERVIEW_FEEDBACK_PROMPT = """
Evaluate this interview answer and provide coaching feedback.

Question: {question}
Target role: {target_role}
Candidate's answer: {answer}
Resume context: {resume_context}
Answer guidance (what a good answer covers): {answer_guidance}

Return JSON:
{{
  "score": 0-100,
  "strengths": ["specific strength in their answer"],
  "weaknesses": ["specific weakness"],
  "missing_points": ["important point not mentioned"],
  "better_answer_structure": ["suggestion 1", "suggestion 2"],
  "feedback": "2-3 sentence coaching summary that teaches, not just evaluates"
}}

Be constructive. Help them improve, don't just grade them.
Score rubric: 90-100=excellent, 70-89=good, 50-69=needs improvement, below 50=significant gaps
"""
