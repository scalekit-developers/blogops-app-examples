import React from 'react';

interface State { error: Error | null }
export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('AppErrorBoundary caught error', error, info);
    }
  }
  reset = () => { this.setState({ error: null }); };
  render() {
    if (this.state.error) {
      return (
        <div className="auth-shell" role="alert" style={{maxWidth:480}}>
          <h1 style={{marginTop:0}}>Something went wrong</h1>
          <p className="lead">An unexpected error occurred in the UI. You can reload or copy details for debugging.</p>
          <pre style={{whiteSpace:'pre-wrap', fontSize:'0.65rem', background:'rgba(0,0,0,0.25)', padding:'0.75rem', borderRadius:6, maxHeight:180, overflow:'auto'}}>{this.state.error.message}</pre>
          <div style={{display:'flex', gap:10, marginTop:12}}>
            <button className="secondary" onClick={()=>window.location.reload()}>Reload</button>
            <button className="secondary" onClick={this.reset}>Dismiss</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
