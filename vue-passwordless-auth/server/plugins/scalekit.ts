import { Scalekit } from '@scalekit-sdk/node';

let scalekitInitError: string | null = null;

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  const { envUrl, clientId, clientSecret } = config.scalekit;

  const valid = !!envUrl && !!clientId && !!clientSecret && isProbablyUrl(envUrl);
  if (!valid) {
    scalekitInitError = 'Scalekit not configured. Set SCALEKIT_ENV_URL (full https://...), SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET.';
    console.warn('[scalekit] ' + scalekitInitError);
    // Do NOT instantiate with bad values (avoids "Invalid URL" crash)
    return;
  }

  try {
    const sk = new Scalekit(envUrl, clientId, clientSecret);
    // @ts-ignore - simple global stash
    globalThis.__scalekit = sk;
  } catch (e: any) {
    scalekitInitError = e?.message || 'Failed to initialize Scalekit client';
    console.error('[scalekit] init error:', scalekitInitError);
  }
});

function isProbablyUrl(u: string) {
  try { const parsed = new URL(u); return ['http:', 'https:'].includes(parsed.protocol); } catch { return false; }
}

export const getScalekit = () => {
  // @ts-ignore
  if (!globalThis.__scalekit) {
    throw createError({ statusCode: 500, statusMessage: scalekitInitError || 'Scalekit client not ready' });
  }
  // @ts-ignore
  return globalThis.__scalekit as InstanceType<typeof Scalekit>;
};
