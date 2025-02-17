import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const fetchToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        try {
          const response = await axios.get(
            `http://localhost:3001/callback?code=${code}`
          );
          localStorage.setItem("user", JSON.stringify(response.data));
          navigate("/dashboard");
        } catch (error) {
          console.error("Error during authentication:", error);
        }
      }
    };

    fetchToken();
  }, [navigate]);

  return <h3>Logging in...</h3>;
};

export default Callback;
