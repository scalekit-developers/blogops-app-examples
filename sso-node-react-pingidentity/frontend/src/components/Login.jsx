import React from "react";
import axios from "axios";


const Login = () => {
    const handleLogin = async (loginMethod) => {
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
            }
        } catch (error) {
            console.error("Error during login request:", error);
        }
    };

    // Updated Styles
    const styles = {
        container: {
            display: "flex",
            height: "100vh",
            background: "linear-gradient(to right, #f8fafc, #e7eff9)",
        },
        sidebar: {
            width: "25%",
            background: "#2a2f45",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "25px",
            textAlign: "center",
            borderTopRightRadius: "20px",
            borderBottomRightRadius: "20px",
        },
        logo: {
            width: "150px",
            marginBottom: "20px",
        },
        navLinks: {
            textAlign: "center",
            fontSize: "15px",
            lineHeight: "1.8",
            marginTop: "15px",
        },
        link: {
            color: "#c0c8d1",
            textDecoration: "none",
            display: "block",
            marginBottom: "10px",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: "500",
            transition: "color 0.3s ease-in-out",
        },
        linkHover: {
            color: "#ffffff",
        },
        mainContent: {
            width: "75%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
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
        },
        primaryButton: {
            background: "#222d3b",
            color: "white",
        },
        secondaryButton: {
            background: "#394d64",
            color: "white",
        },
        sidebarTitle: {
            fontFamily: "'Poppins', sans-serif",
            fontSize: "24px",
            fontWeight: "600",
            marginBottom: "10px",
        },
        sidebarText: {
            fontFamily: "'Poppins', sans-serif",
            fontSize: "13px",
            marginTop: "15px",
            textAlign: "center",
            color: "#b0b8c3",
        },
    };

    return (
        <div style={styles.container}>
            {/* Left Sidebar */}
            <div style={styles.sidebar}>
            <img src="/scalekit.png" alt="Scalekit Logo" style={styles.logo} />
            
            <h2 style={styles.sidebarTitle}>Documents</h2>
                <nav style={styles.navLinks}>
                    <a
                        href="https://docs.scalekit.com/"
                        style={styles.link}
                        onMouseOver={(e) => (e.target.style.color = styles.linkHover.color)}
                        onMouseOut={(e) => (e.target.style.color = styles.link.color)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Overview
                    </a>
                    <a
                        href="https://docs.scalekit.com/scim/quickstart"
                        style={styles.link}
                        onMouseOver={(e) => (e.target.style.color = styles.linkHover.color)}
                        onMouseOut={(e) => (e.target.style.color = styles.link.color)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Authentication
                    </a>
                    <a
                        href="https://docs.scalekit.com/integrations"
                        style={styles.link}
                        onMouseOver={(e) => (e.target.style.color = styles.linkHover.color)}
                        onMouseOut={(e) => (e.target.style.color = styles.link.color)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Integration
                    </a>
                </nav>
                <p style={styles.sidebarText}>Explore our docs for in-depth guidance.</p>
            </div>

            {/* Right Main Content */}
            <div style={styles.mainContent}>
                <div style={styles.card}>
                    <h2 style={styles.title}>SSO Login</h2>
                    <p style={styles.subtitle}>Powered by Ping Identity</p>
                    <hr style={styles.divider} />
                    <button style={{ ...styles.button, ...styles.primaryButton }} onClick={() => handleLogin("google")}>
                        Social Login
                    </button>
                    <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={() => handleLogin("saml")}>
                        Enterprise SAML
                    </button>
                    <p style={{ fontSize: "12px", color: "#777", marginTop: "10px" }}>Choose your authentication method to proceed</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
