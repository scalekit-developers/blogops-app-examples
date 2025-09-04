import { NextResponse } from 'next/server';
import logger, { createChild, redact } from './logger';

export interface ApiSuccess<T = any> { success: true; data: T; correlationId: string; }
export interface ApiError { success: false; error: string; errorCode?: string; correlationId: string; }

export function createCorrelationId() {
  return (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
}

function sanitize(value: any, seen = new WeakSet()): any {
  if (typeof value === 'bigint') {
    // Prefer number if safe, else string
    const num = Number(value);
    return Number.isSafeInteger(num) ? num : value.toString();
  }
  if (Array.isArray(value)) return value.map(v => sanitize(v, seen));
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v, seen)]));
  }
  return value;
}

export function ok<T>(data: T, correlationId: string, init?: ResponseInit) {
  const safe = sanitize(data) as T;
  return NextResponse.json({ success: true, data: safe, correlationId } as ApiSuccess<T>, init);
}

export function fail(error: string, correlationId: string, status = 400, errorCode?: string, meta?: any) {
  logger.error('api error %s %s', errorCode || 'ERR', error, { correlationId, meta: redact(meta) });
  return NextResponse.json({ success: false, error, errorCode, correlationId } as ApiError, { status });
}

export function routeLogger(route: string, correlationId: string) {
  return createChild({ route, correlationId });
}
