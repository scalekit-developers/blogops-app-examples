from __future__ import annotations
import os
import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Load .env for local runs (OPENAI_API_KEY, GITHUB_*), without overriding shell
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=False)
except Exception:
    pass

from crewai import Agent, Task, Crew, Process
from crewai.tools.base_tool import Tool as CrewTool
from create_task_langchain import create_task_tool


def _parse_cli_args(argv: list[str]) -> dict[str, Any]:
    parser = argparse.ArgumentParser(
        description="CrewAI runner for the GitHub Issue create_task tool"
    )
    # JSON-based inputs (highest priority)
    parser.add_argument("--input", "-i", help="JSON string with tool input")
    parser.add_argument("--json", help="Path to JSON file with tool input")
    parser.add_argument("--stdin", action="store_true", help="Read JSON input from STDIN")
    # Direct flags
    parser.add_argument("--title", help="Task title")
    parser.add_argument("--description", help="Task description")
    parser.add_argument("--due-date", dest="due_date", help="Due date ISO 8601 UTC")
    parser.add_argument("--assignee", help="Assignee username")
    parser.add_argument("--priority", choices=["low", "medium", "high"], default="medium")
    parser.add_argument("--visibility", choices=["private", "org"], default="private")
    parser.add_argument("--tag", dest="tags", action="append", default=[], help="Add a tag (repeatable)")
    parser.add_argument("--auth-as", dest="auth_as", choices=["user", "org"], default=None, help="Auth scope to use (optional)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose CrewAI logs")

    args = parser.parse_args(argv)

    data: dict | None = None
    if args.input:
        data = json.loads(args.input)
    elif args.json:
        data = json.loads(Path(args.json).read_text())
    elif args.stdin:
        data = json.loads(sys.stdin.read())

    if data is None:
        data = {
            "title": args.title,
            "description": args.description,
            "due_date": args.due_date,
            "assignee": args.assignee,
            "priority": args.priority,
            "visibility": args.visibility,
            "tags": args.tags or [],
            "auth_as": args.auth_as,
        }

    return {"data": data, "verbose": args.verbose}


def _build_task_description(data: dict[str, Any]) -> str:
    # Provide both JSON and a human summary to help the LLM use the tool correctly
    summary = (
        f"title={data.get('title')!r}, priority={data.get('priority')}, visibility={data.get('visibility')}, "
        f"assignee={data.get('assignee')!r}, due_date={data.get('due_date')!r}, tags={data.get('tags')!r}"
    )
    json_input = json.dumps(data, ensure_ascii=False)
    return (
        "Use the create_task tool exactly once to create a GitHub Issue with the provided input.\n"
        "Do not invent fields or values. If a field is null/omitted, use defaults.\n"
        f"Summary: {summary}\n"
        f"Tool input (JSON): {json_input}"
    )


def main(argv: list[str]) -> int:
    parsed = _parse_cli_args(argv)
    data = parsed["data"]
    verbose = parsed["verbose"]

    # Fallback demo payload if no title provided
    if not data.get("title"):
        if verbose:
            print("No title provided; using demo payload. Pass --title or JSON to specify your issue.")
        data = {
            "title": "Write comparison blog",
            "description": "Draft MCP vs LangChain vs CrewAI article",
            "priority": "high",
            "visibility": "org",
            "tags": ["writing", "comparisons"],
            "auth_as": "user",
        }

    # Build agent and task
    creator = Agent(
        role="Task Creator",
        goal="Create GitHub issues with correct priority and visibility.",
        backstory="You are diligent and confirm details before creating tasks.",
        verbose=verbose,
        tools=[CrewTool.from_langchain(create_task_tool)],
    )

    create_task = Task(
        description=_build_task_description(data),
        expected_output="Return only the JSON from the tool call (no extra commentary).",
        agent=creator,
    )

    crew = Crew(agents=[creator], tasks=[create_task], process=Process.sequential)
    result = crew.kickoff()
    print("Crew result:", result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))