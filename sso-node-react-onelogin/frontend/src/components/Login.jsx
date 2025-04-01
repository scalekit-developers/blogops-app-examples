import React, { useState } from "react";
import axios from "axios";
import { ArrowRight, Info, Lock, User } from "lucide-react";
// Update the import path to point to the correct location
import '../styles/login.css';

const styles = `
.login-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  background-image: linear-gradient(to bottom right, #eff6ff, #eef2ff);
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.login-content {
  width: 100%;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  order: 2;
}

.login-logo {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  z-index: 10;
}

.login-card {
  max-width: 28rem;
  width: 100%;
  padding: 2rem;
  border-radius: 1rem;
  animation: scale-in 0.3s ease-out forwards;
  opacity: 0;
}

.login-button {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  transition-property: all;
  transition-duration: 200ms;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.login-button-google {
  background-color: white;
  border: 1px solid #e2e8f0;
  color: #1e293b;
}

.login-button-google:hover:not(:disabled) {
  background-color: #f8fafc;
}

.login-button-sso {
  background-color: #2563eb;
  color: white;
}

.login-button-sso:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.login-divider {
  position: relative;
  margin: 1.5rem 0;
}

.login-divider::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #e2e8f0;
}

.login-divider-text {
  position: relative;
  display: flex;
  justify-content: center;
  font-size: 0.875rem;
}

.login-divider-text span {
  padding: 0 0.5rem;
  background-color: white;
  color: #64748b;
}

.login-sidebar {
  width: 100%;
  background-color: #0f172a;
  color: white;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  order: 1;
}

.sidebar-content {
  position: relative;
  z-index: 10;
  max-width: 28rem;
  margin: 0 auto;
  animation: fade-in 0.5s ease-out forwards;
  opacity: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
}

.sidebar-feature {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.sidebar-feature:last-child {
  margin-bottom: 0;
}

.sidebar-feature-icon {
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.5rem;
  border-radius: 0.5rem;
}

@media (min-width: 768px) {
  .login-container {
    flex-direction: row;
  }

  .login-content {
    width: 60%;
    padding: 3rem;
    order: 1;
  }

  .login-sidebar {
    width: 40%;
    padding: 3rem;
    order: 2;
  }

  .sidebar-content {
    margin: 0 auto;
    justify-content: center;
    height: 100%;
    text-align: left;
  }

  .login-card {
    padding: 2.5rem;
  }
}

/* Add these styles to fix body margin and full screen */
body, html {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
  width: 100%;
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.space-y-1 > * + * {
  margin-top: 0.25rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-x-3 > * + * {
  margin-left: 0.75rem;
}

.space-x-4 > * + * {
  margin-left: 1rem;
}

.glass {
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Centered content in sidebar */
.docs-section {
  margin-top: 2rem;
}
`;

const Login = () => {
    // Track which button is loading
    const [loadingButton, setLoadingButton] = useState(null);

    // Modified login handler to keep track of which button is loading
    const handleLogin = async (loginMethod) => {
        setLoadingButton(loginMethod);

        try {
            const response = await axios.post(
                "http://localhost:3001/login",
                { login_method: loginMethod },
                { withCredentials: true }
            );

            if (response.data.authorizationUrl) {
                window.location.href = response.data.authorizationUrl;
            } else {
                console.error("No authorization URL received");
                setLoadingButton(null); // Clear loading state
            }
        } catch (error) {
            console.error("Error during login request:", error);
            setLoadingButton(null); // Clear loading state
        }
    };

    return (
        <>
            {/* Inline styles to ensure CSS works */}
            <style>{styles}</style>

            <div className="login-container">
                {/* Content section (Left on larger screens, top on mobile) */}
                <div className="login-content">
                    <div className="login-logo">
                        <h2 className="text-xl font-medium text-indigo-900">Identity</h2>
                    </div>

                    <div className="glass login-card">
                        <div className="space-y-6">
                            <div className="space-y-2 text-center">
                                <span className="inline-block p-2 bg-blue-100 rounded-lg mb-2">
                                    <Lock className="w-5 h-5 text-blue-600" />
                                </span>
                                <h1 className="text-2xl font-medium tracking-tight text-slate-900">SSO Login</h1>
                                <p className="text-sm text-slate-500">
                                    Powered by OneLogin
                                </p>
                            </div>

                            <div className="space-y-4 pt-4">
                                <button
                                    onClick={() => handleLogin("google")}
                                    disabled={loadingButton !== null}
                                    className="login-button login-button-google"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                    </svg>
                                    <span>Sign in with Google</span>
                                    {loadingButton === "google" && (
                                        <svg className="animate-spin ml-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                </button>

                                <button
                                    onClick={() => handleLogin("saml")}
                                    disabled={loadingButton !== null}
                                    className="login-button login-button-sso"
                                >
                                    <User className="w-5 h-5" />
                                    <span>Enterprise SAML</span>
                                    {loadingButton !== "saml" && (
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    )}
                                    {loadingButton === "saml" && (
                                        <svg className="animate-spin ml-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="login-divider">
                                <div className="login-divider-text">
                                    <span>Need help?</span>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-slate-500">
                                    Choose your authentication method to proceed
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info sidebar (Right on larger screens, bottom on mobile) */}
                <div className="login-sidebar">
                    <div className="absolute inset-0 bg-pattern opacity-5"></div>

                    <div className="sidebar-content">
                        <div className="flex flex-col space-y-6">
                            <div className="flex items-center space-x-3 mb-2">
                                <img src="/scalekit.png" alt="Scalekit Logo" className="h-12" />
                            </div>

                            <h2 className="text-3xl font-medium leading-tight">Documents</h2>

                            <p className="text-slate-400">
                                Explore our docs for in-depth guidance.
                            </p>
                        </div>

                        <div className="docs-section">
                            <div className="grid grid-cols-1 gap-4 pt-4">
                                {[
                                    { icon: <Info className="w-5 h-5 text-blue-400" />, title: "Overview", href: "https://docs.scalekit.com/" },
                                    { icon: <Lock className="w-5 h-5 text-blue-400" />, title: "Authentication", href: "https://docs.scalekit.com/scim/quickstart" },
                                    { icon: <User className="w-5 h-5 text-blue-400" />, title: "Integration", href: "https://docs.scalekit.com/integrations" },
                                ].map((item, index) => (
                                    <a
                                        key={index}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="sidebar-feature"
                                        style={{textDecoration: "none", color: "inherit"}}
                                    >
                                        <div className="sidebar-feature-icon">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-medium mb-1">{item.title}</h3>
                                            <p className="text-sm text-slate-400">
                                                Access detailed documentation
                                            </p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;
