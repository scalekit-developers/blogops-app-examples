import { Scalekit } from '@scalekit-sdk/node';

let client: Scalekit | undefined;

export function getScalekit() {
  if (!client) {
    const envUrl = process.env.SCALEKIT_ENV_URL!;
    const id = process.env.SCALEKIT_CLIENT_ID!;
    const secret = process.env.SCALEKIT_CLIENT_SECRET!;
    if (!envUrl || !id || !secret) {
      console.error('[SCALEKIT] missing required env vars', {
        hasEnvUrl: !!envUrl,
        hasClientId: !!id,
        hasClientSecret: !!secret
      });
      throw new Error('Missing Scalekit env vars');
    }
    console.log(`[SCALEKIT] init ${envUrl} id=${id.substring(0, 6)} ...`);
    client = new Scalekit(envUrl, id, secret);
  }
  return client;
}
