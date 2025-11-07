import os
import json
from typing import Optional, Literal
from create_task import CreateTaskInput, create_task_impl

from mcp.server.fastmcp import FastMCP

# Optional: load .env for local runs (so MCP clients launched from VS Code get envs)
try:
    from dotenv import load_dotenv  # type: ignore
    # Load .env from project folder
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

mcp = FastMCP("mcp-task-server")

@mcp.tool()
def create_task(
    title: str,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    assignee: Optional[str] = None,
    priority: Literal["low", "medium", "high"] = "medium",
    visibility: Literal["private", "org"] = "private",
    tags: list[str] = [],
    auth_as: Optional[Literal["user", "org"]] = None,
) -> str:
    payload = CreateTaskInput(
        title=title,
        description=description,
        due_date=due_date,
        assignee=assignee,
        priority=priority,
        visibility=visibility,
        tags=tags,
    )
    result = create_task_impl(payload, auth_as=auth_as)
    return json.dumps(result)

if __name__ == "__main__":
    mcp.run()