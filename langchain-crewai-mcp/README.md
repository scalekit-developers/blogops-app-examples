# LangChain • CrewAI • MCP — GitHub Issue Creator (Python)

This folder implements the same "create task" action three ways, all backed by GitHub Issues:
- Shared core: `create_task.py` (Pydantic validation + GitHub REST)
- LangChain tool: `create_task_langchain.py`
- CrewAI runner: `create_task_crewai.py`
- MCP server (FastMCP): `create_task_mcp_server.py`

Requirements
- Python 3.10+
- A GitHub fine‑grained PAT with Issues: Read/Write access to your repo

Quick start
```bash
cd langchain-crewai-mcp
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Option A: export env in your shell
export GITHUB_REPO=owner/repo            # e.g. parv15/virallens
export GITHUB_USER_TOKEN=<your PAT>      # do NOT commit this

# Option B: create a local .env file (auto‑loaded by all entrypoints)
# .env (do not commit)
# GITHUB_REPO=parv15/virallens
# GITHUB_USER_TOKEN=ghp_...
# OPENAI_API_KEY=sk-...
# Optional org auth default
# CREATE_TASK_AUTH_AS=org
# GITHUB_ORG_TOKEN=ghp_org_pat...
```

Create an issue with LangChain (no hardcoding)
```bash
python create_task_langchain.py \
  --title "Issue from CLI" \
  --description "Created via LangChain tool" \
  --priority high --visibility org \
  --tag demo --tag langchain
```

CrewAI (multi‑agent orchestrator; needs an LLM key)
```bash
export OPENAI_API_KEY=<your OpenAI key>
python create_task_crewai.py
```

MCP server (for MCP clients)
- Server: `create_task_mcp_server.py` (uses FastMCP). It waits for a client over stdio.

Environment loading (.env)
All three entrypoints auto‑load `.env` from this folder (without overriding shell variables):
- LangChain CLI: `create_task_langchain.py`
- CrewAI CLI: `create_task_crewai.py`
- MCP server: `create_task_mcp_server.py`

You can either export env in your shell or place them in `.env` (recommended for local dev). Never commit `.env`.

Org auth and default scope
- To create issues as an org (or using an org-scoped PAT), set `GITHUB_ORG_TOKEN` and either:
  - pass `"auth_as": "org"` in the request, or
  - set `CREATE_TASK_AUTH_AS=org` in `.env` to make it the default for all calls.
- If `auth_as` is omitted, the code resolves it via `CREATE_TASK_AUTH_AS` and falls back to `user`.

Use in VS Code with an MCP client
GitHub Copilot Chat does not load custom MCP servers yet. Use an MCP-capable extension such as Continue or Cline.

Continue config (Command Palette → "Continue: Open Config")
```jsonc
{
  "mcpServers": {
    "mcp-task-server": {
      "command": "/Users/parvmittal/blogops-app-examples/langchain-crewai-mcp/.venv/bin/python",
      "args": ["/Users/parvmittal/blogops-app-examples/langchain-crewai-mcp/create_task_mcp_server.py"],
      "env": { "LOG_LEVEL": "INFO" },
      "workingDirectory": "/Users/parvmittal/blogops-app-examples/langchain-crewai-mcp"
    }
  }
}
```
- Put `GITHUB_REPO` and `GITHUB_USER_TOKEN` in `.env` here; the server will load them automatically.
- In Continue UI → Tools → `mcp-task-server` → `create_task`, provide JSON:
```json
{
  "title": "Issue from VS Code",
  "description": "Created via Continue MCP",
  "priority": "high",
  "visibility": "org",
  "tags": ["vscode", "mcp"],
  "auth_as": "user"
}
```

Cline (alternative MCP extension) — settings.json example
```jsonc
"cline.mcpServers": [
  {
    "name": "mcp-task-server",
    "command": "/Users/parvmittal/blogops-app-examples/langchain-crewai-mcp/.venv/bin/python",
    "args": ["/Users/parvmittal/blogops-app-examples/langchain-crewai-mcp/create_task_mcp_server.py"],
    "cwd": "/Users/parvmittal/blogops-app-examples/langchain-crewai-mcp",
    "env": { "LOG_LEVEL": "INFO" }
  }
]
```

Troubleshooting 401 (Unauthorized)
- Ensure your PAT is valid, not expired, and has Issues: read/write for your repo.
- Prefer `.env` so the server reads secrets directly; avoid `${env:...}` in client configs (not expanded by all clients).
- Verify `GITHUB_REPO` is set to `owner/repo`.

 

Security
- NEVER commit your token. Add `.env` to `.gitignore` and rotate any exposed PAT.
- Load environment at runtime: `set -a; source .env; set +a`

Notes
- `assignee` must be a repo collaborator; otherwise omit it.
- For GitHub Enterprise, set `GITHUB_API_URL=https://github.mycompany.com/api/v3`.
