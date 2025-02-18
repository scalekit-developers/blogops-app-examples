import { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get("code");

      if (!code) {
        console.error("Authentication failed: No code received.");
        alert("Authentication failed. Please try again.");
        return;
      }

      try {
        const response = await axios.get("http://localhost:3001/callback", {
          params: { code }, // Ensure code is properly passed
          withCredentials: true, // Important for session-based authentication
        });

        console.log("Auth Response:", response.data);
        localStorage.setItem("user", JSON.stringify(response.data));

        // Redirect to dashboard
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (error) {
        console.error("Error during authentication:", error);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <h2>Processing authentication...</h2>;
};

export default Callback;
