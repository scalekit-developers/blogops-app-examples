import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Login.css';

function Login() {
  useEffect(() => {
    document.title = "Login | ScaleKit Enterprise SSO";
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:8000/auth/login?provider=google');
      console.log("Authorization URL:", res.data.authorization_url);
      window.location.href = res.data.authorization_url;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  };

  const loginWithSAML = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:8000/auth/login?provider=saml');
      console.log("Authorization URL:", res.data.authorization_url);
      window.location.href = res.data.authorization_url;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
      {/* Documentation Sidebar */}
      <div className="docs-sidebar">
        <div className="sidebar-content">
          <div className="sidebar-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <h2>ScaleKit</h2>
          </div>

          <div className="sidebar-section">
            <h3>Documentation</h3>
            <ul className="sidebar-links">
              <li>
                <a href="https://docs.scalekit.com/" target="_blank" rel="noopener noreferrer">
                  Overview
                </a>
              </li>
              <li>
                <a href="https://docs.scalekit.com/sso/quickstart" target="_blank" rel="noopener noreferrer">
                  Authentication
                </a>
              </li>
              <li>
                <a href="https://docs.scalekit.com/integrations" target="_blank" rel="noopener noreferrer">
                  Integrations
                </a>
              </li>
              <li>
                <a href="https://docs.scalekit.com/apis" target="_blank" rel="noopener noreferrer">
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          <div className="sidebar-footer">
            <p>Explore our docs for in-depth guidance on implementing SSO solutions for your enterprise applications.</p>
          </div>
        </div>
      </div>

      {/* Login Content */}
      <div className="login-content">
        <div className="login-panel">
          <div className="logo-section">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logo">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <h1>ScaleKit SSO</h1>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner-container">
                <div className="spinner"></div>
                <div className="spinner-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
              </div>
              <p>Processing authentication...</p>
            </div>
          ) : (
            <div className="login-section">
              {error && <div className="error-message">{error}</div>}
              <p className="login-description">Choose your authentication method to continue</p>

              <div className="login-buttons">
                <button
                  className="login-button google-login"
                  onClick={loginWithGoogle}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </button>

                <button
                  className="login-button saml-login"
                  onClick={loginWithSAML}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    <circle cx="12" cy="16" r="1"></circle>
                  </svg>
                  Enterprise SSO (SAML)
                </button>
              </div>

              <div className="login-footer">
                <p>Secure authentication powered by ScaleKit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
