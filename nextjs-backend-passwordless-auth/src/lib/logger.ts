import winston from 'winston';

const level = process.env.LOG_LEVEL || 'info';
const isDev = process.env.NODE_ENV !== 'production';

// Replacer / transformer to make BigInt JSON serialisation safe
function bigIntReplacer(_key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

const bigIntSanitizer = winston.format((info) => {
  const seen = new WeakSet();
  function walk(obj: any) {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
    seen.add(obj);
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      if (typeof v === 'bigint') (obj as any)[k] = v.toString();
      else if (v && typeof v === 'object') walk(v);
    }
  }
  walk(info);
  return info;
});

const devFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const rest = Object.keys(meta).length ? ' ' + JSON.stringify(meta, bigIntReplacer) : '';
  return `${timestamp} ${level.toUpperCase()}: ${message}${rest}`;
});

const logger = winston.createLogger({
  level,
  format: winston.format.combine(
  winston.format.timestamp(),
  bigIntSanitizer(), // ensure downstream formats never see raw BigInt
    isDev ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
    isDev ? devFormat : winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ handleExceptions: true }),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
});

export function createChild(context: Record<string, any>) {
  return logger.child(context);
}

export function redact(obj: any, keys: string[] = ['password', 'secret', 'token']) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      keys.includes(k.toLowerCase()) ? [k, '**REDACTED**'] : [k, v]
    )
  );
}

export default logger;
