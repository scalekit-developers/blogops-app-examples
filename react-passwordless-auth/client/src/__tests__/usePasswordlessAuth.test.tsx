import { act, renderHook } from '@testing-library/react';
import { usePasswordlessAuth } from '../auth/usePasswordlessAuth';

describe('usePasswordlessAuth', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = vi.fn(async (url: string, opts?: any) => {
      if (url.includes('/send')) return { ok: true, json: async () => ({ authRequestId: '1', expiresAt: Date.now()/1000+300, expiresIn:300, passwordlessType:'OTP', maskedEmail:'t***@e.com' }) };
      if (url.includes('/resend')) return { ok: true, json: async () => ({ expiresAt: Date.now()/1000+300, expiresIn:300 }) };
      if (url.includes('/verify-code')) {
        const body = JSON.parse(opts?.body || '{}');
        if (body.code === '000000') return { ok:false, json: async () => ({ error:'INVALID_CODE' }) };
        return { ok: true, json: async () => ({ email:'t@e.com', passwordlessType:'OTP' }) };
      }
      if (url.includes('/session')) return { ok: true, json: async () => ({ authenticated:false }) };
      return { ok: false, json: async () => ({ error: 'X' }) };
    });
  });
  it('sends and verifies code', async () => {
    const { result } = renderHook(()=>usePasswordlessAuth({ apiBase:'' }));
    await act(async ()=>{ await result.current.send('test@example.com'); });
    expect(result.current.sendResult?.authRequestId).toBe('1');
    await act(async ()=>{ await result.current.verifyCode('123456'); });
    expect(result.current.phase).toBe('authenticated');
  });
  it('handles invalid code error', async () => {
    const { result } = renderHook(()=>usePasswordlessAuth({ apiBase:'' }));
    await act(async ()=>{ await result.current.send('test@example.com'); });
    await act(async ()=>{ await result.current.verifyCode('000000'); });
    expect(result.current.error).toBe('INVALID_CODE');
  });
});
