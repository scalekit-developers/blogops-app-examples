import { Scalekit } from '@scalekit-sdk/node';
import dotenv from 'dotenv';

// Load environment only once (dev: Next may reload but safe)
dotenv.config();

// Required env var names (trim to catch accidental whitespace)
const REQUIRED_VARS = [
  'SCALEKIT_ENVIRONMENT_URL', // e.g. https://your-env.scalekit.com
  'SCALEKIT_CLIENT_ID',
  'SCALEKIT_CLIENT_SECRET',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k] || process.env[k]?.trim() === '');
  if (missing.length) {
    throw new Error(
      `Missing Scalekit env vars: ${missing.join(', ')}.\n` +
      'Create a .env.local file with:\n' +
      'SCALEKIT_ENVIRONMENT_URL=https://<your-env>.scalekit.com\n' +
      'SCALEKIT_CLIENT_ID=xxxxxxxx\n' +
      'SCALEKIT_CLIENT_SECRET=xxxxxxxx\n'
    );
  }
  // Validate URL format early to avoid later ERR_INVALID_URL from SDK internals
  try {
    // Throws if invalid
    // eslint-disable-next-line no-new
    new URL(process.env.SCALEKIT_ENVIRONMENT_URL as string);
  } catch (e) {
    throw new Error(`SCALEKIT_ENVIRONMENT_URL is not a valid absolute URL: ${process.env.SCALEKIT_ENVIRONMENT_URL}`);
  }
}

let scalekitInstance: Scalekit | undefined;

export function getScalekit(): Scalekit {
  if (!scalekitInstance) {
    validateEnv();
    scalekitInstance = new Scalekit(
      process.env.SCALEKIT_ENVIRONMENT_URL!.trim(),
      process.env.SCALEKIT_CLIENT_ID!.trim(),
      process.env.SCALEKIT_CLIENT_SECRET!.trim()
    );
  }
  return scalekitInstance;
}

// No eager export to avoid initialization before env vars are set.
