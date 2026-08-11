SYSTEM_JSON = (
    "You are an expert career coach and technical recruiter. "
    "You MUST respond with valid JSON only. No explanations outside JSON. "
    "No markdown code fences. Pure JSON."
)

RESUME_EXTRACTION_PROMPT = """
Analyze the following resume markdown and extract structured information.

Resume:
{markdown}

Return a JSON object with this exact structure:
{{
  "candidate": {{
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "summary": ""
  }},
  "skills": [
    {{
      "name": "skill name",
      "category": "Web Development|Backend|Data Science|DevOps|Security|Other",
      "proficiency": "beginner|intermediate|advanced",
      "confidence": 0.0-1.0,
      "evidence": "quote or context from resume",
      "evidence_source": "Skills section|Projects|Experience|Education",
      "evidence_strength": "strong|moderate|weak"
    }}
  ],
  "projects": [
    {{
      "name": "",
      "description": "",
      "technologies": [],
      "role": "",
      "evidence": "key achievement or detail"
    }}
  ],
  "experience": [
    {{
      "company": "",
      "role": "",
      "start_date": "",
      "end_date": "",
      "description": "",
      "technologies": []
    }}
  ],
  "education": [
    {{
      "institution": "",
      "degree": "",
      "field": "",
      "start_date": "",
      "end_date": ""
    }}
  ],
  "certifications": [
    {{
      "name": "",
      "issuer": "",
      "date": ""
    }}
  ],
  "achievements": []
}}

CRITICAL EVIDENCE RULES:
- A skill listed only in the Skills section with no project/experience backing = evidence_strength "weak", confidence 0.3-0.5
- A skill with a project using it = evidence_strength "moderate", confidence 0.6-0.75
- A skill with measurable project achievements = evidence_strength "strong", confidence 0.8-1.0
- A skill with multiple projects + experience = evidence_strength "strong", confidence 0.85-1.0
"""

GAP_ANALYSIS_PROMPT = """
Perform a comprehensive skill gap analysis.

Candidate resume (markdown):
{markdown}

Extracted skills:
{skills_json}

Projects:
{projects_json}

Experience:
{experience_json}

Target role: {target_role}
Timeline: {timeline_months} months
Weekly hours available: {weekly_hours}

Return a JSON object:
{{
  "readiness_score": 0-100,
  "score_breakdown": {{
    "technical_skills": 0-35,
    "projects_evidence": 0-25,
    "experience": 0-15,
    "role_requirements": 0-15,
    "certifications_achievements": 0-10
  }},
  "strengths": [
    {{
      "skill": "",
      "level": "",
      "evidence": "",
      "demand_in_role": 0.0-1.0
    }}
  ],
  "weak_skills": [
    {{
      "skill": "",
      "issue": "listed but not demonstrated",
      "recommendation": ""
    }}
  ],
  "missing_skills": [
    {{
      "skill": "",
      "current_level": "none|beginner|intermediate",
      "target_level": "beginner|intermediate|advanced",
      "gap_size": 0-100,
      "priority": "critical|high|medium|low",
      "reason": "why this skill matters for target role",
      "demand_frequency": 0.0-1.0,
      "recommended_action": "specific action to close this gap"
    }}
  ],
  "project_gaps": ["skill that needs project evidence"],
  "experience_gaps": ["type of practical exposure missing"],
  "recommendations": ["top 3-5 specific recommendations ordered by impact"]
}}

Scoring rules:
- technical_skills: weighted by evidence_strength and demand in target role
- projects_evidence: depth and relevance of projects to target role
- experience: work experience relevance and duration
- role_requirements: coverage of must-have skills for target role
- certifications_achievements: relevant certs and measurable achievements
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
