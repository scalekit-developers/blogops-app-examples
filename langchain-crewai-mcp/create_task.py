from __future__ import annotations
import os, uuid, logging, requests
from typing import List, Literal, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("create_task")
if not logger.handlers:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

class CreateTaskInput(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    due_date: Optional[str] = Field(default=None, description="ISO 8601 UTC; must be future if set")
    assignee: Optional[str] = Field(default=None, description="GitHub username (repo collaborator)")
    priority: Literal["low", "medium", "high"] = "medium"
    visibility: Literal["private", "org"] = "private"
    tags: List[str] = Field(default_factory=list, max_length=20)

    @field_validator("due_date")
    @classmethod
    def validate_due_date_future(cls, v: Optional[str]):
        if v is None:
            return v
        try:
            dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
        except Exception as e:
            raise ValueError("due_date must be ISO 8601") from e
        if dt <= datetime.now(timezone.utc):
            raise ValueError("due_date must be in the future")
        return v

AuthScope = Literal["user", "org"]

def _resolve_auth_scope(explicit: Optional[AuthScope]) -> AuthScope:
    if explicit in ("user", "org"):
        return explicit  # caller provided
    env_scope = (os.getenv("CREATE_TASK_AUTH_AS") or "").strip().lower()
    if env_scope in ("user", "org"):
        return env_scope  # from env
    # Default when not provided or invalid
    return "user"

def _resolve_github_token(auth_as: AuthScope) -> str:
    token = (os.getenv("GITHUB_USER_TOKEN") if auth_as == "user" else os.getenv("GITHUB_ORG_TOKEN")) or os.getenv("GITHUB_TOKEN")
    if not token:
        raise RuntimeError(f"Missing GitHub token for auth_as='{auth_as}'. Set GITHUB_{auth_as.upper()}_TOKEN or GITHUB_TOKEN.")
    return token

def _create_task_github(args: CreateTaskInput, auth_as: AuthScope, request_id: str) -> dict:
    repo = os.getenv("GITHUB_REPO")
    if not repo or "/" not in repo:
        raise RuntimeError("GITHUB_REPO must be set to 'owner/repo'")
    api = (os.getenv("GITHUB_API_URL") or "https://api.github.com").rstrip("/")
    token = _resolve_github_token(auth_as)

    labels = list(args.tags)
    labels.append(f"priority:{args.priority}")
    labels.append(f"visibility:{args.visibility}")

    meta_lines = []
    if args.due_date:
        meta_lines.append(f"Due: {args.due_date}")
    if args.assignee:
        meta_lines.append(f"Assignee: {args.assignee}")

    body_parts = []
    if args.description:
        body_parts.append(args.description)
    if meta_lines:
        body_parts.append("\n".join(meta_lines))
    body = "\n\n".join(body_parts) if body_parts else None

    payload: dict = {"title": args.title, "labels": labels}
    if body:
        payload["body"] = body
    if args.assignee:
        payload["assignees"] = [args.assignee]

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    }
    url = f"{api}/repos/{repo}/issues"

    logger.info("create_task.github_start", extra={"request_id": request_id, "repo": repo, "labels_count": len(labels)})
    resp = requests.post(url, json=payload, headers=headers, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    result = {
        "id": str(data.get("id") or uuid.uuid4()),
        "title": args.title,
        "description": args.description,
        "due_date": args.due_date,
        "assignee": args.assignee,
        "priority": args.priority,
        "visibility": args.visibility,
        "tags": args.tags,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "auth_scope_used": auth_as,
        "provider": "github",
        "provider_issue_number": data.get("number"),
        "url": data.get("html_url"),
        "simulated": False,
    }
    logger.info("create_task.github_success", extra={"request_id": request_id, "issue_number": data.get("number")})
    return result

def create_task_impl(args: CreateTaskInput, auth_as: Optional[AuthScope] = None, request_id: Optional[str] = None) -> dict:
    request_id = request_id or str(uuid.uuid4())
    resolved_scope = _resolve_auth_scope(auth_as)
    logger.info("create_task.start", extra={"request_id": request_id, "auth_as": resolved_scope, "provider": "github"})
    return _create_task_github(args, resolved_scope, request_id)