import { APIEvent, json } from 'solid-start';

export async function GET(_event: APIEvent) {
  const mask = (v?: string) => (v ? v[0] + '*'.repeat(Math.max(0, v.length - 2)) + v.slice(-1) : null);
  const resp = {
    ok: true,
    env: {
      APP_BASE_URL: process.env.APP_BASE_URL || null,
      SCALEKIT_ENV_URL: process.env.SCALEKIT_ENV_URL || null,
      SCALEKIT_CLIENT_ID: mask(process.env.SCALEKIT_CLIENT_ID),
      SCALEKIT_CLIENT_SECRET_PRESENT: !!process.env.SCALEKIT_CLIENT_SECRET,
      SESSION_SECRET_PRESENT: !!process.env.SESSION_SECRET
    }
  };
  return json(resp);
}
