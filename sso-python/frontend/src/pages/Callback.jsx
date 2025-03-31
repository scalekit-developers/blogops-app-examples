import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Callback.css';

function Callback() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Authenticating | ScaleKit Enterprise SSO";
  }, []);

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        setError(`Authentication error: ${url.searchParams.get("error_description") || errorParam}`);
        setLoading(false);
        return;
      }

      if (!code) {
        setError("No authorization code found in URL");
        setLoading(false);
        return;
      }

      try {
        console.log(`Processing callback with code: ${code}`);
        const response = await axios.get(`http://localhost:8000/auth/callback`, {
          params: { code }
        });

        console.log("Authentication successful:", response.data);

        // Make sure we have valid user data before storing
        if (response.data && (response.data.email || response.data.id || response.data.name)) {
          // Store user info in localStorage for the dashboard
          localStorage.setItem('userInfo', JSON.stringify(response.data));

          // Redirect to dashboard
          navigate('/dashboard');
        } else {
          throw new Error("Invalid user data received from server");
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setError(error.response?.data?.error || 'Authentication failed');
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="callback-container">
        <div className="callback-loading">
          <div className="spinner-container">
            <div className="spinner"></div>
            <div className="spinner-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
          </div>
          <h2>Processing Your Authentication</h2>
          <p>Please wait while we securely log you in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="callback-container">
        <div className="callback-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Return to Login</button>
        </div>
      </div>
    );
  }

  return null;
}

export default Callback;
