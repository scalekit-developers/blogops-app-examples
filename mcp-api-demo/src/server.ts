import { createProjectTool } from "./tools/order-tools.js";
import { listTasksTool } from "./tools/product-tools.js";
import { createUserTool, getUserTool } from "./tools/user-tools.js";

const tools = [getUserTool, createUserTool, listTasksTool, createProjectTool];

console.log("Registered MCP Tools:");
tools.forEach((tool) => {
  console.log(`- ${tool.name}: ${tool.description}`);
});
