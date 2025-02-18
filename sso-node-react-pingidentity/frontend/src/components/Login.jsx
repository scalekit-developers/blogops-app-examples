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

    // Inline CSS Styles
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
        buttonContainer: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
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
        },
        primaryButton: {
            background: "#222d3b",
            color: "white",
        },
        primaryButtonHover: {
            background: "#1a2431",
        },
        secondaryButton: {
            background: "#394d64",
            color: "white",
        },
        secondaryButtonHover: {
            background: "#2e3e54",
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
            width: "200px", // Increased size
            height: "200px", // Increased size
        },
    };

    return (
        <div style={styles.container}>
            {/* Top Right Logo */}
            <img
                src="https://image.pitchbook.com/xXsUuHVF1NN9lBgDJObUYJr6m2O1716375546115_200x200"
                alt="Company Logo"
                style={styles.logo}
            />

            <div style={styles.card}>
                <h2 style={styles.title}>SSO Login</h2>
                <p style={styles.subtitle}>Powered by Ping Identity</p>
                <hr style={styles.divider} />

                <div style={styles.buttonContainer}>
                    <button
                        style={{ ...styles.button, ...styles.primaryButton }}
                        onMouseOver={(e) => (e.target.style.background = styles.primaryButtonHover.background)}
                        onMouseOut={(e) => (e.target.style.background = styles.primaryButton.background)}
                        onClick={() => handleLogin("google")}
                    >
                        Social Login
                    </button>
                    <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onMouseOver={(e) => (e.target.style.background = styles.secondaryButtonHover.background)}
                        onMouseOut={(e) => (e.target.style.background = styles.secondaryButton.background)}
                        onClick={() => handleLogin("saml")}
                    >
                        Enterprise SAML
                    </button>
                </div>

                <p style={styles.footer}>Choose your authentication method to proceed</p>
            </div>
        </div>
    );
};

export default Login;
