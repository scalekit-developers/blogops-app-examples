import { useCallback, useEffect, useState } from 'react';
import type { PasswordlessPhase, SendResult } from '../types/auth';
interface Options { apiBase?: string }
// LocalStorage key constants (resend removed for sample demo simplicity)
const LS_AUTH_REQUEST_ID = 'pw_auth_request_id';
const LS_SEND_RESULT = 'pl.sendResult';
export function usePasswordlessAuth(opts: Options = {}) {
  const apiBase = opts.apiBase || import.meta.env.VITE_APP_API_BASE || '/api';
  const [phase, setPhase] = useState<PasswordlessPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [email, setEmail] = useState('');
  // resend flow intentionally omitted in sample (keep minimal footprint)
  const send = useCallback(async (inputEmail: string) => {
    setError(null); setPhase('sending');
    try {
      const r = await fetch(`${apiBase}/auth/passwordless/send`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: inputEmail }) });
      if (!r.ok) throw new Error((await r.json()).error || 'SEND_FAIL');
      const data: SendResult = await r.json();
      setSendResult(data); setPhase('codeSent'); setEmail(inputEmail);
      // Persist authRequestId for magic link origin enforcement
  try { localStorage.setItem(LS_AUTH_REQUEST_ID, data.authRequestId); } catch {}
  try { localStorage.setItem(LS_SEND_RESULT, JSON.stringify(data)); } catch {}
  // (resend cooldown logic removed)
    } catch (e: any) { setError(e.message); setPhase('error'); }
  }, [apiBase]);
  const verifyCode = useCallback(async (code: string) => { if (!sendResult) return; setPhase('verifying'); try { const r = await fetch(`${apiBase}/auth/passwordless/verify-code`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ authRequestId: sendResult.authRequestId, code }), credentials:'include' }); const body = await r.json(); if (!r.ok) throw new Error(body.error || 'VERIFY_FAIL'); try { localStorage.setItem('pl.sessionEmail', body.email); } catch {} setPhase('authenticated'); } catch (e: any) { setError(e.message); setPhase('error'); } }, [apiBase, sendResult]);
  const handleMagicLink = useCallback(async (linkToken: string, authRequestId?: string) => {
  // Prevent duplicate simultaneous verifications for same token
  if ((handleMagicLink as any)._activeToken === linkToken && (phase === 'verifying' || phase === 'authenticated')) return; // dedupe
  (handleMagicLink as any)._activeToken = linkToken; // mark active
  setPhase('verifying'); setError(null);
    // Fallback to persisted authRequestId if not provided in URL
    let finalAuthReq = authRequestId;
    if (!finalAuthReq) {
  try { finalAuthReq = localStorage.getItem(LS_AUTH_REQUEST_ID) || undefined; } catch {}
    }
    try {
  const r = await fetch(`${apiBase}/auth/passwordless/verify-link`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ linkToken, authRequestId: finalAuthReq }), credentials:'include' });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || body.message || 'VERIFY_FAIL');
  try { localStorage.setItem('pl.sessionEmail', body.email); } catch {}
      setPhase('authenticated');
    } catch (e: any) {
      setError(e.message);
      setPhase('error');
      // allow retry if failed
      (handleMagicLink as any)._activeToken = undefined;
    }
  }, [apiBase]);
  // session check
  useEffect(()=>{ (async()=>{ try { const r = await fetch(`${apiBase}/auth/passwordless/session`, { credentials:'include' }); const b = await r.json(); if (b.authenticated) { if (b.email) try { localStorage.setItem('pl.sessionEmail', b.email); } catch {}; setPhase('authenticated'); } } catch {} })(); }, [apiBase]);

  // hydrate cached sendResult (OTP flow) on mount if still valid
  useEffect(()=>{
    if (sendResult) return; // already have
    try {
  const raw = localStorage.getItem(LS_SEND_RESULT);
      if (!raw) return;
      const parsed: SendResult = JSON.parse(raw);
      // If expired discard
  if (parsed.expiresAt * 1000 < Date.now()) { localStorage.removeItem(LS_SEND_RESULT); return; }
      setSendResult(parsed);
      if (phase === 'idle') setPhase('codeSent');
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ticking clock for countdown
  useEffect(()=>{ if (!sendResult) return; const id = setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(id); }, [sendResult]);
  const timeLeft = sendResult ? Math.max(0, Math.floor(sendResult.expiresAt*1000 - now)/1000) : 0;
  // Auto clear expired OTP context to prevent redirect loop to /verify with no valid request
  useEffect(()=>{
    if (sendResult && timeLeft === 0 && phase === 'codeSent') {
      try { localStorage.removeItem(LS_SEND_RESULT); } catch {}
      setSendResult(null);
      setPhase('idle');
    }
  }, [sendResult, timeLeft, phase]);
  const logout = useCallback(async () => {
    try { await fetch(`${apiBase}/auth/passwordless/logout`, { method:'POST', credentials:'include' }); } catch {}
    setPhase('idle'); setSendResult(null); setEmail(''); setError(null);
  try { localStorage.removeItem(LS_AUTH_REQUEST_ID); } catch {}
  try { localStorage.removeItem(LS_SEND_RESULT); } catch {}
  try { localStorage.removeItem('pl.sessionEmail'); } catch {}
  }, [apiBase]);

  const reset = useCallback(() => {
    setPhase('idle'); setSendResult(null); setEmail(''); setError(null);
    try { localStorage.removeItem(LS_AUTH_REQUEST_ID); } catch {}
    try { localStorage.removeItem(LS_SEND_RESULT); } catch {}
  }, []);

  let sessionEmail: string | null = null; try { sessionEmail = localStorage.getItem('pl.sessionEmail'); } catch {}
  return { phase, error, email: sessionEmail || email, sendResult, timeLeft, send, verifyCode, handleMagicLink, logout, reset };
}
