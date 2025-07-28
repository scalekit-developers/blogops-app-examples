import { mockDB } from "../api/mock-api.js";
import { ProjectSchema } from "../schemas/shared.js";
import { MCPTool } from "../types.js";

export const createProjectTool: MCPTool = {
  name: "create_project",
  description: "Create a new project for a user with a list of task IDs",
  inputSchema: ProjectSchema.pick({ userId: true, taskIds: true }),
  async handler({ userId, taskIds }: { userId: string; taskIds: string[] }) {
    // Validate user
    const user = mockDB.users.find((u: any) => u.id === userId);
    if (!user) throw { code: "USER_NOT_FOUND", message: "User not found" };
    // Validate tasks
    const tasks = taskIds.map((tid: string) => {
      const t = mockDB.tasks.find((t: any) => t.id === tid);
      if (!t) throw { code: "TASK_NOT_FOUND", message: `Task ${tid} not found` };
      if (!t.isActive) throw { code: "TASK_INACTIVE", message: `Task ${tid} is inactive` };
      return t;
    });
    // Create project
    const id = `prj${mockDB.projects.length + 1}`;
    const total = tasks.reduce((sum: number, t: any) => sum + t.estimate, 0);
    const project = { id, userId, taskIds, total, createdAt: new Date().toISOString() };
    mockDB.projects.push(project);
    return project;
  }
};
