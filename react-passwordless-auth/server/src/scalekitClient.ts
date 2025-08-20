import { Scalekit } from '@scalekit-sdk/node';
export function createScalekitClient() {
  const { SCALEKIT_ENVIRONMENT_URL, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET } = process.env;
  if (!SCALEKIT_ENVIRONMENT_URL || !SCALEKIT_CLIENT_ID || !SCALEKIT_CLIENT_SECRET) throw new Error('Missing Scalekit env vars');
  return new Scalekit(SCALEKIT_ENVIRONMENT_URL, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET);
}
export const scalekit = createScalekitClient();
