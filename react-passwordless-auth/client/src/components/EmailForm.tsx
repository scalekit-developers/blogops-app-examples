import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { navigate } from '../router/Router';

export const EmailForm: React.FC = () => {
	const { send, phase, error, sendResult, timeLeft } = useAuth();
	const [email, setEmail] = useState('');
	const [localError, setLocalError] = useState<string | null>(null);
	const isValidEmail = (v: string) => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(v.trim());
	const valid = isValidEmail(email);
	const disabled = phase === 'sending' || !valid;

	useEffect(()=>{ if (sendResult) { try { localStorage.setItem('pl.sendResult', JSON.stringify(sendResult)); } catch {} } }, [sendResult]);

	return (
		<div>
			{(phase === 'idle' || phase === 'sending') && (
				<form className="auth-form" onSubmit={async e => { e.preventDefault(); if (!valid) { setLocalError('Enter a valid email.'); return; } setLocalError(null); const result = await send(email.trim()); if (result.passwordlessType === 'OTP' || result.passwordlessType === 'LINK_OTP') navigate('/verify'); }}>
					<label>Email Address</label>
					<input
						type="email"
						placeholder="you@example.com"
						required
						value={email}
						onChange={e=>{ setEmail(e.target.value); if (localError) setLocalError(null); }}
						autoComplete="email"
					/>
					<button className="primary" disabled={disabled} aria-disabled={disabled}>
						{phase === 'sending' ? 'Sending…' : 'Send Code / Link'}
					</button>
					{(localError || error) && <div className="alert error" role="alert">{localError || error}</div>}
				</form>
			)}
			{sendResult && (
				<div className="alert" style={{marginTop:'1rem'}}>
					<strong>Check your email:</strong> We sent a {sendResult.passwordlessType === 'OTP' ? '6‑digit code' : sendResult.passwordlessType === 'LINK' ? 'magic link' : 'code & magic link'} to <em>{sendResult.maskedEmail}</em>.
					{sendResult.passwordlessType !== 'LINK' && <div className="hint">Enter the code on the next step. {timeLeft>0 && <span>Expires in {Math.ceil(timeLeft)}s.</span>}</div>}
					{sendResult.passwordlessType !== 'OTP' && <div className="hint">Magic link will auto-complete sign in.</div>}
				</div>
			)}
		</div>
	);
};
