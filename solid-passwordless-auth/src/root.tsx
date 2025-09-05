// Root layout + error boundary (legacy solid-start 0.3 style)
import { Suspense } from 'solid-js';
import { Body, ErrorBoundary, Head, Html, Meta, Route, Routes, Scripts, Title } from 'solid-start';
import { Protected } from './components/Protected';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './routes/dashboard';
import Home from './routes/index';
import Verify from './routes/passwordless/verify';
import './styles/theme.css';

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <Meta />
        <Title>Scalekit Passwordless</Title>
      </Head>
  <Body style="margin:0">
        <Suspense fallback={<div style="padding:2rem">Loading...</div>}>
          <ErrorBoundary fallback={(e) => (typeof window === 'undefined'
            ? (console.error('[SSR BOUNDARY ERROR]', e), <pre style="padding:2rem;color:crimson;white-space:pre-wrap">{String(e)}</pre>)
            : <pre style="padding:2rem;color:crimson;white-space:pre-wrap">{String(e)}</pre>
          )}>
            <AuthProvider>
              <Routes>
                <Route path="/" component={Home} />
                <Route path="/passwordless/verify" component={Verify} />
                <Route path="/dashboard" component={() => <Protected><Dashboard /></Protected>} />
              </Routes>
            </AuthProvider>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
