import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Tickets from "./Tickets";
import Thank_you from "./Thank_you";
import Support_Tickets from "./Support_Tickets";
import Login from "./Login";
import Employee_Center from "./Employee_Center";
import Dashboard from "./Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/Tickets" element={<Tickets />} />
      <Route path="/thank-you" element={<Thank_you />} />
      <Route path="/Support_Tickets" element={<Support_Tickets />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Employee_Center" element={<Employee_Center />} />
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="/" element={<Navigate to="/Tickets" />} />
    </Routes>
  );
}

export default App;
