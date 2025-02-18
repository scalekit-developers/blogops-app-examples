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

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">Dashboard</h2>
        
        {user ? (
          <div className="text-center">
            <p className="text-gray-700 text-lg mb-4">Welcome<strong>{user.name}</strong>!</p>
            <p className="text-gray-600 text-md mb-6">Logged in as: <strong>{user.email}</strong></p>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-red-500 text-white rounded-lg text-lg hover:bg-red-600 transition duration-300"
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
