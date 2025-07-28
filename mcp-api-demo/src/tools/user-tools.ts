import { z } from "zod";
import { createUser, getUserById, mockDB } from "../api/mock-api.js";
import { UserSchema } from "../schemas/shared.js";
import { MCPTool } from "../types.js";

export const getUserTool: MCPTool = {
  name: "get_user",
  description: "Retrieve a user by ID",
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: UserSchema,
  handler: async ({ userId }) => {
    const user = getUserById(userId);
    if (!user) {
      throw { code: "NOT_FOUND", message: "User not found" };
    }
    return user;
  }
};

export const createUserTool: MCPTool = {
  name: "create_user",
  description: "Create a new user",
  inputSchema: UserSchema.omit({ id: true }),
  outputSchema: UserSchema,
  handler: async ({ name, email }) => {
    // Simple unique ID generation
    const id = `u${mockDB.users.length + 1}`;
    if (mockDB.users.some((u) => u.email === email)) {
      throw { code: "ALREADY_EXISTS", message: "Email already registered" };
    }
    const user = { id, name, email };
    createUser(user);
    return user;
  }
};
