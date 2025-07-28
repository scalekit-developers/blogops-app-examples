import { beforeEach, describe, expect, it } from "vitest";
import { mockDB } from "../src/api/mock-api";
import { createProjectTool } from "../src/tools/order-tools";
import { listTasksTool } from "../src/tools/product-tools";
import { createUserTool, getUserTool } from "../src/tools/user-tools";
// Helper to reset mockDB for each test
function resetDB() {
    mockDB.users.length = 0;
    mockDB.users.push({ id: "u1", name: "Alice", email: "alice@example.com" }, { id: "u2", name: "Bob", email: "bob@example.com" });
    mockDB.tasks.length = 0;
    mockDB.tasks.push({ id: "t1", name: "Setup CI", estimate: 5, isActive: true }, { id: "t2", name: "Write Docs", estimate: 3, isActive: false }, { id: "t3", name: "Code Review", estimate: 2, isActive: true });
    mockDB.projects.length = 0;
}
describe("MCP Tools", () => {
    beforeEach(resetDB);
    it("get_user: returns user by ID", async () => {
        const user = await getUserTool.handler({ userId: "u1" });
        expect(user).toMatchObject({ id: "u1", name: "Alice" });
    });
    it("get_user: throws on missing user", async () => {
        await expect(getUserTool.handler({ userId: "nope" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
    it("create_user: creates a new user", async () => {
        const user = await createUserTool.handler({ name: "Carol", email: "carol@example.com" });
        expect(user).toMatchObject({ name: "Carol", email: "carol@example.com" });
        expect(mockDB.users).toHaveLength(3);
    });
    it("create_user: throws on duplicate email", async () => {
        await expect(createUserTool.handler({ name: "X", email: "alice@example.com" })).rejects.toMatchObject({ code: "ALREADY_EXISTS" });
    });
    it("list_tasks: returns all tasks", async () => {
        const tasks = await listTasksTool.handler({});
        expect(tasks).toHaveLength(3);
        expect(tasks[0]).toHaveProperty("name");
    });
    it("create_project: creates project for valid user/tasks", async () => {
        const project = await createProjectTool.handler({ userId: "u1", taskIds: ["t1", "t3"] });
        expect(project).toHaveProperty("id");
        expect(project.total).toBeCloseTo(5 + 2);
        expect(mockDB.projects).toHaveLength(1);
    });
    it("create_project: throws if user not found", async () => {
        await expect(createProjectTool.handler({ userId: "nope", taskIds: ["t1"] })).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    });
    it("create_project: throws if task not found", async () => {
        await expect(createProjectTool.handler({ userId: "u1", taskIds: ["bad"] })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    });
    it("create_project: throws if task inactive", async () => {
        await expect(createProjectTool.handler({ userId: "u1", taskIds: ["t2"] })).rejects.toMatchObject({ code: "TASK_INACTIVE" });
    });
});
