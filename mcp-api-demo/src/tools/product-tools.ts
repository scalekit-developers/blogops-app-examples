import { mockDB } from "../api/mock-api.js";
import { TaskSchema } from "../schemas/shared.js";
import { MCPTool } from "../types.js";

export const listTasksTool: MCPTool = {
  name: "list_tasks",
  description: "List all tasks",
  inputSchema: TaskSchema.pick({}),
  async handler() {
    return mockDB.tasks;
  }
};
