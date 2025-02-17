import React from "react";
import axios from "axios";

const Login = () => {
    const handleLogin = async (loginMethod) => {
        try {
            const response = await axios.post(
                "http://localhost:3001/login",
                { login_method: loginMethod },
                { withCredentials: true } // Ensures cookies are sent if needed
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

    return (
        <div className="container">
            <h2>Login with SSO</h2>
            <button onClick={() => handleLogin("google")}>Ping Identity</button>
            <button onClick={() => handleLogin("saml")}>Enterprise SAML</button>
        </div>
    );
};

export default Login;
