import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  estimate: z.number(),
  isActive: z.boolean()
});

export const ProjectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  taskIds: z.array(z.string()),
  total: z.number(),
  createdAt: z.string()
});
