#!/usr/bin/env python3
"""Question Mark step 2: generate a case study from the selected story."""

import json
import os
import re
import sys
from datetime import datetime

import anthropic

BASE = os.environ.get("GITHUB_WORKSPACE", "/home/sam/samsmasm.github.io")
INPUT_PATH = os.path.join(BASE, "questionmark", "candidate_stories.json")
OUTPUT_PATH = os.path.join(BASE, "questionmark", "case_study.json")

GENERATION_PROMPT = """\
You are writing an IB Business Management case study for 16-18 year old students.

Tone rules:
- Engaging but not condescending
- Assume intelligence, not prior business knowledge
- Explain any business jargon the first time you use it
- Prose in the main body -- no bullet-point overload
- Never use em dashes

You may draw on your own knowledge of the company and story to add depth, but stay factually grounded. Do not invent specific numbers or quotes.

The story:
Title: {title}
Source: {source}
Published: {published}
Summary: {summary}

Write the case study and return a single JSON object with these exact fields:

"title"
A punchy case study title that frames the business question -- not just the article headline.

"hook"
1-2 sentences. Journalistic, punchy. Something a student would actually want to read.

"background"
One short paragraph. Who is this company and what do they do? Assume the student knows nothing about them.

"what_happened"
Array of strings. The key developments, factual and clear, no editorialising. 3-5 items.

"data_snapshot"
Array of strings. Key numbers and figures -- revenue, growth, margins, market share, job cuts, whatever is relevant. Present each figure simply with context. Omit this field entirely if the story has no meaningful data.

"the_tension"
2-3 paragraphs of prose. What is the core business problem here? What competing pressures or interests are at play? This is the analytical heart. Name the IB Business Management concepts at work (e.g. stakeholder conflict, cash flow management, brand equity, span of control).

"outside_view"
One paragraph. How are journalists, analysts, or competitors interpreting this differently from how the company frames it? Omit this field entirely if no meaningful outside view exists.

"reflection_questions"
Array of exactly 5 questions. Each must:
- Require analysis or evaluation, not just recall
- Connect to IB Business Management concepts where natural
- One must be a "what would you need to know to decide?" question
- One must be a genuinely open evaluative question with no obvious right answer

"extension"
One suggested task for students who want to go further. Could be research, a debate motion, data interpretation, or a comparison with a rival company. Omit this field entirely if nothing natural comes to mind.

"curriculum_links"
Array of IB BM unit areas this case study connects to. Use these labels only:
"Unit 1: Business organisation and environment"
"Unit 2: Human resource management"
"Unit 3: Finance and accounts"
"Unit 4: Marketing"
"Unit 5: Operations management"

Return ONLY the JSON object. No markdown fences. No other text."""


def load_selected_story():
    if not os.path.exists(INPUT_PATH):
        print(f"ERROR: {INPUT_PATH} not found -- run score_stories.py first.", file=sys.stderr)
        sys.exit(1)
    with open(INPUT_PATH, encoding="utf-8") as f:
        stories = json.load(f)
    selected = [s for s in stories if s.get("selected")]
    if not selected:
        print("No selected story found in candidate_stories.json.", file=sys.stderr)
        sys.exit(1)
    return selected[0]


def generate_case_study(client, story):
    print(f"Generating case study for: {story['title'][:70]}", file=sys.stderr)
    prompt = GENERATION_PROMPT.format(
        title=story["title"],
        source=story["source"],
        published=story.get("published", "unknown"),
        summary=story["summary"],
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()
    cleaned = re.sub(r"```json\n?|```", "", raw).strip()
    return json.loads(cleaned)


def main():
    client = anthropic.Anthropic()

    story = load_selected_story()
    case_study = generate_case_study(client, story)

    output = {
        "generated_date": datetime.now().strftime("%Y-%m-%d"),
        "source_title": story["title"],
        "source_url": story["url"],
        "source": story["source"],
        "scores": story["scores"],
        **case_study,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"Wrote {OUTPUT_PATH}", file=sys.stderr)

    print(f"\n--- {output['title']} ---", file=sys.stderr)
    print(f"Hook: {output.get('hook', '')}", file=sys.stderr)
    print(f"Curriculum: {', '.join(output.get('curriculum_links', []))}", file=sys.stderr)


if __name__ == "__main__":
    main()
