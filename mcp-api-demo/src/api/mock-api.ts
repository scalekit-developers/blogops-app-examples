import { z } from "zod";
import { ProjectSchema, UserSchema } from "../schemas/shared.js";

const users = [
  { id: "u1", name: "Alice", email: "alice@example.com" },
  { id: "u2", name: "Bob", email: "bob@example.com" }
];

const tasks = [
  { id: "t1", name: "Setup CI", estimate: 5, isActive: true },
  { id: "t2", name: "Write Docs", estimate: 3, isActive: false },
  { id: "t3", name: "Code Review", estimate: 2, isActive: true }
];

const projects: Array<z.infer<typeof ProjectSchema>> = [];

export const mockDB = {
  users,
  tasks,
  projects
};

export function getUserById(userId: string) {
  return users.find((u) => u.id === userId) || null;
}

export function createUser(data: z.infer<typeof UserSchema>) {
  users.push(data);
  return data;
}

export function getTasks() {
  return tasks;
}

export function createProject(data: z.infer<typeof ProjectSchema>) {
  projects.push(data);
  return data;
}
