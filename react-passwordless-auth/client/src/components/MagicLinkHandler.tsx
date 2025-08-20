import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export const MagicLinkHandler: React.FC = () => {
	const { handleMagicLink, phase, error } = useAuth();
	const [attempted, setAttempted] = useState(false);
	const [hasToken, setHasToken] = useState(false);
	useEffect(()=>{
		const params = new URLSearchParams(window.location.search);
		const token = params.get('link_token');
		const authRequestId = params.get('auth_request_id') || undefined;
		if (token) { setHasToken(true); setAttempted(true); handleMagicLink(token, authRequestId); }
	}, [handleMagicLink]);
	if (!hasToken) return null;
	if (phase === 'authenticated') {
		// Remove link_token params from URL to avoid re-triggering verification on refresh/navigation
		try {
			if (window.location.search.includes('link_token')) {
				const clean = window.location.pathname + window.location.hash;
				window.history.replaceState({}, '', clean);
			}
		} catch {}
		return <div style={{background:'#e6fbe6',padding:'0.75rem',borderRadius:6,marginTop:16}}>Signed in via magic link.</div>;
	}
	return (
		<div style={{background:'#f0f4ff',padding:'0.75rem',borderRadius:6,marginTop:16}}>
			{phase === 'verifying' && 'Verifying magic link…'}
			{attempted && phase === 'error' && <span style={{color:'red'}}>Magic link failed: {error}. Try requesting a new one.</span>}
		</div>
	);
};
