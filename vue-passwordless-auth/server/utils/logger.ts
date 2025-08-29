// Simple structured logger. In real apps consider pino/winston.
import { H3Event } from 'h3';

function ts() { return new Date().toISOString(); }

export function getReqId(event?: H3Event) {
  // Reuse existing id if already set
  // @ts-ignore
  if (event && event.context.__reqId) return (event.context as any).__reqId;
  const id = Math.random().toString(36).slice(2, 10);
  if (event) { /* @ts-ignore*/ event.context.__reqId = id; }
  return id;
}

export function logInfo(event: H3Event | undefined, msg: string, meta: Record<string, any> = {}) {
  const line = { level: 'info', time: ts(), reqId: getReqId(event), msg, ...meta };
  console.log(JSON.stringify(line));
}

export function logError(event: H3Event | undefined, msg: string, meta: Record<string, any> = {}) {
  const line = { level: 'error', time: ts(), reqId: getReqId(event), msg, ...meta };
  console.error(JSON.stringify(line));
}
