from __future__ import annotations
import os
import uuid
import argparse
import json
import sys
from pathlib import Path
from typing import Optional, Literal
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.callbacks.manager import CallbackManager
from create_task import CreateTaskInput, create_task_impl

# Load .env for local runs (GITHUB_*), without overriding shell vars
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=False)
except Exception:
    pass

class CreateTaskArgs(BaseModel):
    title: str = Field(min_length=3, max_length=200, description="Task title")
    description: Optional[str] = Field(default=None, description="Task details")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 UTC")
    assignee: Optional[str] = None
    priority: Literal["low", "medium", "high"] = "medium"
    visibility: Literal["private", "org"] = "private"
    tags: list[str] = Field(default_factory=list)
    auth_as: Optional[Literal["user", "org"]] = Field(default=None, description="Auth scope; defaults via CREATE_TASK_AUTH_AS or 'user'")

class ToolObsHandler(BaseCallbackHandler):
    def on_tool_start(self, serialized, input_str, **kwargs):
        print(f"[Tool Start] {serialized.get('name')} input={input_str}")
    def on_tool_end(self, output, **kwargs):
        print(f"[Tool End] output={str(output)[:200]}")

@tool("create_task", args_schema=CreateTaskArgs, description="Create a task as a GitHub Issue.")
def create_task_tool(**kwargs) -> dict:
    """Create a task as a GitHub Issue."""
    args = CreateTaskArgs(**kwargs)
    request_id = str(uuid.uuid4())
    payload = CreateTaskInput(
        title=args.title,
        description=args.description,
        due_date=args.due_date,
        assignee=args.assignee,
        priority=args.priority,
        visibility=args.visibility,
        tags=args.tags,
    )
    return create_task_impl(payload, auth_as=args.auth_as, request_id=request_id)

def _parse_cli_args(argv: list[str]) -> dict:
    parser = argparse.ArgumentParser(description="Create a task via LangChain tool (GitHub Issues backend)")
    # Input options
    parser.add_argument("--input", "-i", help="JSON string with tool input")
    parser.add_argument("--json", help="Path to JSON file with tool input")
    parser.add_argument("--stdin", action="store_true", help="Read JSON input from STDIN")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose tool callbacks")
    # Direct flags (used if JSON input not provided)
    parser.add_argument("--title", help="Task title")
    parser.add_argument("--description", help="Task description")
    parser.add_argument("--due-date", dest="due_date", help="Due date ISO 8601 UTC")
    parser.add_argument("--assignee", help="Assignee username")
    parser.add_argument("--priority", choices=["low", "medium", "high"], default="medium")
    parser.add_argument("--visibility", choices=["private", "org"], default="private")
    parser.add_argument("--tag", dest="tags", action="append", default=[], help="Add a tag (repeatable)")
    parser.add_argument("--auth-as", dest="auth_as", choices=["user", "org"], default=None, help="Auth scope to use (optional)")

    args = parser.parse_args(argv)

    # Prefer JSON-based inputs when provided
    data: dict | None = None
    if args.input:
        data = json.loads(args.input)
    elif args.json:
        data = json.loads(Path(args.json).read_text())
    elif args.stdin:
        data = json.loads(sys.stdin.read())

    if data is None:
        # Build from individual flags
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


def _run_with_config(data: dict, verbose: bool) -> dict:
    # Validate via args_schema to ensure parity with LangChain usage
    args = CreateTaskArgs(**data)
    handler = ToolObsHandler() if verbose else None
    config = {"callbacks": [handler], "run_name": "create_task_cli"} if handler else {"run_name": "create_task_cli"}
    return create_task_tool.invoke(args.model_dump(), config=config)


if __name__ == "__main__":
    parsed = _parse_cli_args(sys.argv[1:])
    data = parsed["data"]
    verbose = parsed["verbose"]

    # If neither JSON nor sufficient flags provided, fall back to demo payload
    if not data.get("title"):
        if verbose:
            print("No title provided; running demo payload. Pass --title or --input/--json/--stdin to provide input.")
        data = {
            "title": "Write comparison blog",
            "description": "Draft MCP vs LangChain vs CrewAI article",
            "priority": "high",
            "visibility": "org",
            "tags": ["writing", "comparisons"],
            "auth_as": "user",
        }

    result = _run_with_config(data, verbose)
    print("Result:", result)