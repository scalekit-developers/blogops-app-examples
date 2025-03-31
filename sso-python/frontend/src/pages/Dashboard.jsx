import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState('');
  const [initials, setInitials] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Dashboard | ScaleKit Enterprise SSO";
  }, []);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('userInfo');
    if (!storedUser) {
      console.log("No user info found in localStorage, redirecting to login");
      navigate('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    console.log("Retrieved user data:", userData);
    setUser(userData);

    // Format current date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(now.toLocaleDateString('en-US', options));

    // Generate initials from name or email
    if (userData) {
      if (userData.name && userData.name.trim()) {
        const nameParts = userData.name.split(' ').filter(part => part.length > 0);
        setInitials(nameParts.map(part => part[0]).join('').toUpperCase());
      } else if (userData.email) {
        setInitials(userData.email[0].toUpperCase());
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/');
  };

  if (!user) return (
    <div className="dashboard-loading">
      <div className="spinner"></div>
      <p>Loading your dashboard...</p>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>ScaleKit SSO</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Dashboard
          </a>
          <a href="#" className="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </a>
          <a href="#" className="nav-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Settings
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
          </div>
        </header>

        <div className="content-container">
          <div className="welcome-card">
            <div className="welcome-text">
              <h2>Welcome back, {user.name || user.email.split('@')[0]}</h2>
              <p>You're logged in via {user.provider || "ScaleKit SSO"}</p>
              <span className="date">{currentDate}</span>
            </div>
            <div className="welcome-decoration">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <h3>User Profile</h3>
              <div className="profile-details">
                <div className="profile-item">
                  <span className="label">Email</span>
                  <span className="value">{user.email}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Employee ID</span>
                  <span className="value">{user.employee_number || "Not available"}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Provider</span>
                  <span className="value">{user.provider}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Full Name</span>
                  <span className="value">{user.name || "Not provided"}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>Authentication Details</h3>
              <div className="auth-stats">
                <div className="auth-stat">
                  <div className="stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h4>Authentication Type</h4>
                    <p>Enterprise SSO</p>
                  </div>
                </div>

                <div className="auth-stat">
                  <div className="stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h4>Session Status</h4>
                    <p>Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
