import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export const OtpForm: React.FC = () => {
	const { phase, sendResult, verifyCode, error, timeLeft } = useAuth();
	const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
	const inputs = useRef<Array<HTMLInputElement | null>>([]);
	const [autoSubmitted, setAutoSubmitted] = useState(false);

	useEffect(()=>{ if(sendResult && sendResult.passwordlessType !== 'LINK') inputs.current[0]?.focus(); },[sendResult]);
		if (!sendResult) return null;
		if (sendResult.passwordlessType === 'LINK') return null; // pure magic link, no OTP

	const code = digits.join('');
	useEffect(()=>{ if (code.length === 6 && !autoSubmitted) { setAutoSubmitted(true); verifyCode(code); } }, [code, autoSubmitted, verifyCode]);

	const onChange = (i: number, v: string) => {
		if (!/^[0-9]?$/.test(v)) return;
		setAutoSubmitted(false);
		const copy = [...digits]; copy[i] = v; setDigits(copy);
		if (v && i < 5) inputs.current[i+1]?.focus();
	};

	const disabled = phase === 'verifying';
	const submitManually = () => { if (code.length === 6) { setAutoSubmitted(true); verifyCode(code); } };
	const clear = () => { setDigits(Array(6).fill('')); inputs.current[0]?.focus(); };

	// Handle paste (full code) into any single box
	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		const raw = e.clipboardData.getData('text');
		if (!raw) return;
		const onlyDigits = raw.replace(/\D/g,'').slice(0,6);
		if (onlyDigits.length < 2) return; // let normal single char paste fall through
		e.preventDefault();
		const arr = onlyDigits.split('').concat(Array(6 - onlyDigits.length).fill(''));
		setDigits(arr as string[]);
		if (onlyDigits.length === 6) { setAutoSubmitted(true); verifyCode(onlyDigits); }
		else {
			const nextIndex = onlyDigits.length < 6 ? onlyDigits.length : 5;
			inputs.current[nextIndex]?.focus();
		}
	};

		return (
		<div style={{marginTop:'1.5rem'}}>
			<h2 style={{margin:'0 0 1rem'}}>Enter the Code</h2>
			<div className="code-grid">
				{digits.map((d,i)=>(
					<input
						aria-label={`Digit ${i+1}`}
						key={i}
						value={d}
						onChange={e=>onChange(i,e.target.value)}
						onPaste={handlePaste}
						ref={el=>inputs.current[i]=el}
						maxLength={1}
						inputMode="numeric"
						pattern="[0-9]*"
					/>
				))}
			</div>
			<div className="otp-actions">
				<button className="secondary" type="button" onClick={submitManually} disabled={code.length!==6 || disabled}>{disabled ? 'Verifying…' : 'Verify'}</button>
				<button className="secondary" type="button" onClick={clear} disabled={disabled}>Clear</button>
			</div>
			<div className="hint">{timeLeft > 0 ? <>Code expires in {Math.ceil(timeLeft)}s</> : 'Code expired. Resend to get a new one.'}</div>
			{error && <div className="alert error" style={{marginTop:14}} role="alert">{error}</div>}
		</div>
	);
};
