import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/"); // Redirect to login if no user session
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "linear-gradient(to right, #f8fafc, #e7eff9)",
      margin: 0,
      position: "relative",
    },
    card: {
      background: "white",
      padding: "35px",
      borderRadius: "12px",
      boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.1)",
      textAlign: "center",
      width: "350px",
    },
    title: {
      fontSize: "22px",
      fontWeight: "600",
      color: "#222",
      marginBottom: "5px",
    },
    subtitle: {
      fontSize: "14px",
      color: "#666",
      marginBottom: "20px",
    },
    divider: {
      width: "100%",
      height: "1px",
      backgroundColor: "#ddd",
      marginBottom: "20px",
      border: "none",
    },
    table: {
      width: "100%",
      marginBottom: "20px",
      borderCollapse: "collapse",  // Removes unnecessary space
    },
    tableHeader: {
      backgroundColor: "#f1f1f1",
      textAlign: "left",
      padding: "10px",
      fontWeight: "600",
    },
    tableCell: {
      padding: "10px",
      borderBottom: "1px solid #ddd",
      textAlign: "left",
      width: "50%",
      wordBreak: "break-word",  // Prevents long text from breaking layout
    },
    button: {
      width: "80%",
      padding: "12px",
      border: "none",
      borderRadius: "6px",
      fontSize: "16px",
      fontWeight: "500",
      cursor: "pointer",
      marginBottom: "12px",
      transition: "all 0.3s ease-in-out",
      textAlign: "center",
      display: "block",  // Centers the button
      margin: "0 auto",  // Ensures proper alignment
    },
    primaryButton: {
      background: "#222d3b",
      color: "white",
    },
    primaryButtonHover: {
      background: "#1a2431",
    },
    footer: {
      fontSize: "12px",
      color: "#777",
      marginTop: "10px",
    },
    logo: {
      position: "absolute",
      top: "5px",
      right: "10px",
      width: "150px", // Increased size
      height: "150px", // Increased size
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Dashboard</h2>
        
        {user ? (
          <div className="text-center">
            <p style={styles.subtitle}>Welcome <strong>{user.name}</strong>!</p>
            <hr style={styles.divider} />
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Detail</th>
                  <th style={styles.tableHeader}>Information</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.tableCell}>Email</td>
                  <td style={styles.tableCell}>{user.email}</td>
                </tr>
                <tr>
                  <td style={styles.tableCell}>Given Name</td>
                  <td style={styles.tableCell}>{user.given_name}</td>
                </tr>
                <tr>
                  <td style={styles.tableCell}>Family Name</td>
                  <td style={styles.tableCell}>{user.family_name}</td>
                </tr>
                <tr>
                  <td style={styles.tableCell}>employee_number</td>
                  <td style={styles.tableCell}>{user.employee_number}</td>
                </tr>
              </tbody>
            </table>
            <button
              onClick={handleLogout}
              style={{ ...styles.button, ...styles.primaryButton }}
              onMouseOver={(e) => (e.target.style.background = styles.primaryButtonHover.background)}
              onMouseOut={(e) => (e.target.style.background = styles.primaryButton.background)}
            >
              Logout
            </button>
          </div>
        ) : (
          <p className="text-gray-600 text-center">Fetching user details...</p>
        )}
      </div>
    </div>
  );
};
export default Dashboard;
