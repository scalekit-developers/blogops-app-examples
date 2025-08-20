import React from 'react';
import { useAuth } from '../auth/AuthProvider';
import { EmailForm } from '../components/EmailForm';
import { MagicLinkHandler } from '../components/MagicLinkHandler';
import { OtpForm } from '../components/OtpForm';

// Super light router without external deps.
// Uses window.location.pathname and basic navigation helper.
export const navigate = (path: string) => {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const usePath = () => {
  const [path, setPath] = React.useState(() => window.location.pathname);
  React.useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return path;
};

export const Router: React.FC = () => {
  const path = usePath();
  const auth = useAuth();
  const { phase, error, sendResult, reset } = auth as any;

  React.useEffect(() => {
    // After sending, if OTP required navigate to /verify automatically.
    if (phase === 'codeSent' && (sendResult?.passwordlessType === 'OTP' || sendResult?.passwordlessType === 'LINK_OTP')) {
      if (window.location.pathname !== '/verify') navigate('/verify');
    }
  }, [phase, sendResult]);

  const Banner = () => (
    <div style={{ padding: '0.5rem 0', fontSize: '0.75rem', color:'#444' }}>
      <strong>Phase:</strong> {phase}
      {error && <span style={{ color: 'crimson', marginLeft: 8 }}>Error: {error}</span>}
    </div>
  );

  const LogoBar = () => (
    <div className="logo-header">
      <div className="logo-group">
        <img src="/scalekit.png" alt="Scalekit" />
        <span className="logo-tagline">Passwordless Demo</span>
      </div>
      <div className="top-right" style={{position:'static'}}>
        {phase === 'authenticated' && <button className="secondary" onClick={auth.logout}>Logout</button>}
        {phase !== 'authenticated' && path !== '/' && <button className="secondary" onClick={()=>{ reset(); navigate('/'); }}>Restart</button>}
      </div>
    </div>
  );

  if (phase === 'authenticated') {
    return (
      <div className="auth-shell">
        <LogoBar />
        <h1 style={{marginTop:0}}>Welcome</h1>
        <p className="lead" style={{marginBottom:'1.25rem'}}>Signed in as <strong style={{color:'#fff'}}>{auth.email}</strong>.</p>
        <div className="alert success">Session active. You can now access protected resources.</div>
        <div style={{marginTop:'1.75rem'}}>
          <h2 style={{margin:'0 0 0.75rem', fontSize:'0.85rem', letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-dim)'}}>Resources</h2>
          <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gap:10}}>
            <li><a href="https://docs.scalekit.com/passwordless/quickstart/" target="_blank" rel="noreferrer" className="inline-btn" style={{display:'inline-block', padding:'0.55rem 0.85rem', borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid var(--panel-border)'}}>Scalekit Passwordless Quickstart ↗</a></li>
            <li><a href="https://scalekit.com/blog" target="_blank" rel="noreferrer" className="inline-btn" style={{display:'inline-block', padding:'0.55rem 0.85rem', borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid var(--panel-border)'}}>Scalekit Blog ↗</a></li>
          </ul>
        </div>
      </div>
    );
  }

  if (path === '/verify') {
    return (
      <div className="auth-shell">
        <LogoBar />
        <h1 style={{marginTop:0}}>Verify</h1>
        {!sendResult && phase !== 'verifying' && (
          <div style={{marginBottom:'1rem'}}>
            <p className="lead" style={{marginBottom:'0.75rem'}}>No active verification context. Start again.</p>
            <button className="secondary" type="button" onClick={()=>{ reset(); navigate('/'); }}>Start Over</button>
          </div>
        )}
        {sendResult?.passwordlessType === 'LINK' && (
          <p className="lead">Click the magic link we sent to your email to finish signing in. Keep this tab open. If a code was included you can also enter it below.</p>
        )}
        {sendResult && sendResult.passwordlessType !== 'LINK' && <>
          <OtpForm />
          <div style={{marginTop:'0.75rem', display:'flex', justifyContent:'flex-end'}}>
            <button className="secondary" type="button" onClick={()=>{ reset(); navigate('/'); }}>Start Over</button>
          </div>
        </>}
        {sendResult && sendResult.passwordlessType === 'LINK' && (
          <div style={{marginTop:'0.75rem', display:'flex', justifyContent:'flex-end'}}>
            <button className="secondary" type="button" onClick={()=>{ reset(); navigate('/'); }}>Start Over</button>
          </div>
        )}
        {sendResult && phase === 'codeSent' && sendResult.expiresAt*1000 < Date.now() && (
          <div className="alert" style={{marginTop:'1rem'}}>
            Code expired.
            <div style={{marginTop:8}}><button className="secondary" type="button" onClick={()=>{ reset(); navigate('/'); }}>Request New Code</button></div>
          </div>
        )}
        <MagicLinkHandler />
      </div>
    );
  }

  // default / start route
  return (
    <div className="auth-shell">
      <LogoBar />
      <h1 style={{marginTop:0}}>Sign In</h1>
      <p className="lead">Access your account securely with email only. We'll send you a magic link and optional one‑time code.</p>
      <EmailForm />
      <MagicLinkHandler />
    </div>
  );
};
