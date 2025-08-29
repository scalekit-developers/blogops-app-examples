import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth/AuthProvider';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Router } from './router/Router';
import './styles/global.css';
createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<AppErrorBoundary>
			<AuthProvider>
				<Router />
			</AuthProvider>
		</AppErrorBoundary>
	</React.StrictMode>
);
