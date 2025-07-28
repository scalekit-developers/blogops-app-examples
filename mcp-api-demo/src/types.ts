export interface MCPTool {
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema?: unknown;
  handler: (args: any) => Promise<any>;
}
