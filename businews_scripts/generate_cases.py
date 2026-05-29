#!/usr/bin/env python3
"""BusiNews step 2: generate a case study from the selected story."""

import json
import os
import sys
from datetime import datetime

import anthropic

BASE = os.environ.get("GITHUB_WORKSPACE", "/home/sam/samsmasm.github.io")
INPUT_PATH = os.path.join(BASE, "businews", "candidate_stories.json")
OUTPUT_PATH = os.path.join(BASE, "businews", "case_study.json")

GENERATION_PROMPT = """\
You are writing an IB Business Management case study for 16-18 year old students.

Tone rules:
- Engaging but not condescending
- Assume intelligence, not prior business knowledge
- Explain any business jargon the first time you use it
- Prose in the main body, no bullet-point overload
- Never use em dashes (not even "--"). Use commas, colons, or rephrase instead.

Target length: the total body of the case study (all sections combined) should be around 500-600 words. Be tight. Every sentence must earn its place.

You may draw on your own knowledge of the company and story to add depth, but stay factually grounded. Do not invent specific numbers or quotes.

The story:
Title: {title}
Source: {source}
Published: {published}
Summary: {summary}"""

CASE_STUDY_TOOL = {
    "name": "create_case_study",
    "description": "Output a structured IB Business Management case study.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "A punchy case study title that frames the business question -- not just the article headline.",
            },
            "hook": {
                "type": "string",
                "description": "1-2 sentences. Journalistic, punchy. Something a student would actually want to read.",
            },
            "background": {
                "type": "string",
                "description": "2-3 sentences only. Who is this company and what do they do? Assume the student knows nothing.",
            },
            "what_happened": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-4 items maximum. One sentence each. Factual, no editorialising.",
            },
            "data_snapshot": {
                "type": "array",
                "items": {"type": "string"},
                "description": "2-3 key figures with brief context. Omit entirely if the story has no meaningful data.",
            },
            "the_tension": {
                "type": "string",
                "description": "One tight paragraph, around 100-120 words. What is the core business problem? Name the IB BM concepts at work. No em dashes.",
            },
            "outside_view": {
                "type": "string",
                "description": "2-3 sentences on how analysts or journalists see this differently from the company. Omit if nothing meaningful to add.",
            },
            "reflection_questions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Exactly 5 questions. Keep each to one sentence. At least one 'what would you need to know to decide?' and one genuinely open evaluative question.",
            },
            "extension": {
                "type": "string",
                "description": "One sentence suggesting a task for students who want to go further. Omit if nothing natural.",
            },
            "curriculum_links": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": [
                        "Unit 1: Business organisation and environment",
                        "Unit 2: Human resource management",
                        "Unit 3: Finance and accounts",
                        "Unit 4: Marketing",
                        "Unit 5: Operations management",
                    ],
                },
                "description": "IB BM unit areas this case study connects to.",
            },
        },
        "required": ["title", "hook", "background", "what_happened", "the_tension", "reflection_questions", "curriculum_links"],
    },
}


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
        tools=[CASE_STUDY_TOOL],
        tool_choice={"type": "tool", "name": "create_case_study"},
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].input


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
