# MCP Internal Developer Platform Demo

A self-contained TypeScript project that demonstrates how to map a REST-style API into clean, composable MCP tools. This is a working code sample designed to teach developers how to define tools, structure schemas, handle errors, and organize logic — all without relying on any third-party APIs or real backends.

---

## What This Project Does

This repo simulates a simplified internal developer platform backend with operations for:

- Retrieving user profiles
- Listing tasks
- Creating projects

Each operation is modeled as a cleanly defined MCP tool, including:

- A clear name and description
- Typed input and output schemas (using Zod)
- A mock backend implementation
- Consistent error handling
- Unit tests

This is designed as a code sample you can pitch, clone, or extend — with no external dependencies.

---

## Project Structure

```
mcp-internal-developer-platform-demo/
├── src/
│   ├── tools/
│   │   ├── user-tools.ts // Tools: get_user, create_user
│   │   ├── product-tools.ts // Tools: list_tasks
│   │   └── order-tools.ts // Tools: create_project
│   ├── api/
│   │   └── mock-api.ts // Simulated backend logic
│   ├── schemas/
│   │   └── shared.ts // Shared Zod schemas
│   ├── types.ts // MCPTool interface
│   └── server.ts // Tool registration entry point
├── tests/
│   └── tool-handlers.test.ts // Unit tests for tool logic
├── scripts/
│   └── fix-extensions.cjs // Post-build ESM import fixer
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## Tech Stack

| Component       | Choice            | Purpose                         |
|----------------|-------------------|---------------------------------|
| Language        | TypeScript        | Type-safe logic and tooling     |
| Validation      | Zod               | Input/output schemas            |
| Runtime         | Node.js           | Lightweight, no framework       |
| Testing         | Vitest            | Unit + integration testing      |
| Server Layer    | None              | Tool registration only          |

No real database, HTTP server, or third-party APIs are used — everything is mocked in-memory.

---

## MCP Tool Format

A local `MCPTool` interface is defined like this:

```ts
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema?: unknown;
  handler: (args: any) => Promise<any>;
}
```

Each tool is implemented with this shape and grouped by domain.

---

## Getting Started

### 1. Install dependencies
```sh
npm install
```

### 2. Run the project
```sh
npm start
```
You should see:
```
Registered MCP Tools:
- get_user: Retrieve a user by ID
- create_user: Create a new user
- list_tasks: List all tasks
- create_project: Create a new project for a user with a list of task IDs
```

### 3. Run tests
```sh
npm test
```

---

## Mock Backend

The file `src/api/mock-api.ts` contains in-memory mock data and backend functions like:
- `getUserById(userId)`
- `createUser(data)`
- `getTasks()`
- `createProject(data)`

No real HTTP requests — just mock data.

---

## Testing

Unit tests are in `tests/tool-handlers.test.ts` and cover:
- Schema correctness
- Happy path responses
- Structured error cases (e.g., not found, invalid input)

---

## Node.js v22+ and ESM Compatibility

This project is fully compatible with Node.js v22+ and ESM. To ensure this:
- All local imports use `.js` extensions.
- A post-build script (`scripts/fix-extensions.cjs`) rewrites imports in the output to include `.js` extensions.
- The build process is:
  1. Compile TypeScript (`tsc`)
  2. Fix ESM imports (`node scripts/fix-extensions.cjs`)
  3. Run with Node.js

---

## Troubleshooting

- Error: Unknown file extension ".ts"
  - Always use `npm start` (which builds and runs the compiled JS), not `ts-node` directly.
- Error: Cannot find module .../dist/xyz
  - Ensure you ran `npm run build` and the post-build script fixed all imports.
- Still stuck?
  - Delete the `dist/` directory and re-run `npm start`.
  - Make sure you are using Node.js v22+ and TypeScript 5+.

---

## Output Goals

This codebase is:
- Understandable at a glance
- Shows how to implement MCP tools in practice
- Avoids external dependencies
- Usable in tutorials, articles, or onboarding docs

You can extend this project with:
- Real HTTP APIs (e.g., using Express)
- A CLI wrapper
- Integration with real backends or ScaleKit if needed

But the default state remains zero-dependency, zero-setup, and fully educational.
