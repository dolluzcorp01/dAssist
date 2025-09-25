import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Tickets from "./Tickets";
import Thank_you from "./Thank_you";
import Ticket_dashboard from "./Ticket_dashboard";
import Login from "./Login";

function App() {
  return (
    <Routes>
      <Route path="/Tickets" element={<Tickets />} />
      <Route path="/thank-you" element={<Thank_you />} />
      <Route path="/Ticket_dashboard" element={<Ticket_dashboard />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/" element={<Navigate to="/Tickets" />} />
    </Routes>
  );
}

export default App;
