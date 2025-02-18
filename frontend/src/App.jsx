import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";

const App = () => {
  return (
    <Router>
      <Routes> 
        <Route path="/" element={<Login />} />
        <Route path="/callback" element={<Callback/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
      </Routes>
    </Router>
  );
};

export default App;
