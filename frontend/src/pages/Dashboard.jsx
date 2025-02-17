import React from "react";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div>
      <h2>Welcome {user.email}</h2>
      <button
        onClick={() => {
          localStorage.removeItem("user");
          window.location.href = "/";
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
