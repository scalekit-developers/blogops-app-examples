import React from 'react';
import { useAuth } from './auth/AuthProvider';
import { EmailForm } from './components/EmailForm';
import { MagicLinkHandler } from './components/MagicLinkHandler';
import { OtpForm } from './components/OtpForm';

export const App: React.FC = () => {
	const { phase } = useAuth();
	return (
		<div style={{maxWidth:520,margin:'2rem auto',fontFamily:'system-ui',lineHeight:1.4}}>
			<h2 style={{marginTop:0}}>Passwordless Demo</h2>
			<p style={{marginTop:0,color:'#555',fontSize:14}}>Demonstrates OTP, Magic Link, or hybrid passwordless auth with Scalekit.</p>
			<div style={{fontSize:12,background:'#fafafa',padding:'4px 8px',border:'1px solid #eee',borderRadius:4,marginBottom:12}}>State: <strong>{phase}</strong></div>
			<EmailForm />
			<OtpForm />
			<MagicLinkHandler />
			{phase === 'authenticated' && <div style={{marginTop:24,background:'#e6fbe6',padding:'1rem',borderRadius:8}}>You are signed in. (Add protected app content here.)</div>}
		</div>
	);
};
