import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

// You'll need to install react-icons or import from lucide-react if you already have it
import { LogOut, User, Mail, Briefcase, Home, Calendar, Settings, Bell, Menu } from "lucide-react";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Keep the original authentication logic
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/"); // Redirect to login if no user session
    }

    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    // Keep the original logout functionality
    localStorage.removeItem("user");
    navigate("/");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (!user) return '';

    if (user.given_name && user.family_name) {
      return `${user.given_name[0]}${user.family_name[0]}`;
    }

    if (user.name) {
      const nameParts = user.name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`;
      }
      return user.name[0];
    }

    return user.email ? user.email[0].toUpperCase() : '?';
  };

  const getProviderName = () => {
    if (!user || !user.provider) return 'Unknown';

    switch(user.provider) {
      case 'google':
        return 'Google';
      case 'saml':
        return 'SAML/OneLogin';
      default:
        return user.provider;
    }
  };

  // Get current date for dashboard
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="dashboard-card">
            <h2 className="card-title">Authentication Required</h2>
            <p>No user data found. Please log in.</p>
            <button
              onClick={() => navigate('/')}
              className="sidebar-footer button"
              style={{ marginTop: '1rem' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-logo">
          <img src="/scalekit.png" alt="Scalekit Logo" />
          {/* Removed the text span */}
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="sidebar-nav-item active">
            <Home size={20} />
            <span>Dashboard</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <User size={20} />
            <span>Profile</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <Calendar size={20} />
            <span>Activity</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <p>Signed in with {getProviderName()}</p>
          <button onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="dashboard-header">
        <button className="mobile-menu-toggle" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <h1 className="header-title">Welcome to your Dashboard</h1>
        <div className="header-actions">
          <div className="user-profile">
            <div className="user-avatar">
              {getUserInitials()}
            </div>
            <span className="user-name">
              {user.name || `${user.given_name} ${user.family_name}`}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-content">
        <div className="dashboard-info-grid">
          <div className="info-card">
            <div className="info-card-header">
              <h3 className="info-card-title">Current Session</h3>
              <div className="info-card-icon">
                <User size={18} color="#4f5eff" />
              </div>
            </div>
            <p className="info-card-value">Active</p>
            <span className="info-card-label">{currentDate}</span>
          </div>

          <div className="info-card">
            <div className="info-card-header">
              <h3 className="info-card-title">Authentication</h3>
              <div className="info-card-icon">
                <Briefcase size={18} color="#4f5eff" />
              </div>
            </div>
            <p className="info-card-value">{getProviderName()}</p>
            <span className="info-card-label">SSO Authentication</span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">User Profile Information</h2>
            <span className="card-badge">User Data</span>
          </div>

          <table className="dashboard-table">
            <thead>
              <tr>
                <th className="dashboard-table-header">Attribute</th>
                <th className="dashboard-table-header">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="dashboard-table-cell">Email</td>
                <td className="dashboard-table-cell">{user.email}</td>
              </tr>
              <tr>
                <td className="dashboard-table-cell">Given Name</td>
                <td className="dashboard-table-cell">{user.given_name || 'N/A'}</td>
              </tr>
              <tr>
                <td className="dashboard-table-cell">Family Name</td>
                <td className="dashboard-table-cell">{user.family_name || 'N/A'}</td>
              </tr>
              <tr>
                <td className="dashboard-table-cell">Provider</td>
                <td className="dashboard-table-cell">{getProviderName()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dashboard-footer">
          <p>Successfully authenticated via ScaleKit SSO • {new Date().getFullYear()}</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
