import React, { useState, useEffect } from "react";
import LeftNavbar from "./left_navbar";
import { apiFetch } from "./utils/api";
import { Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";
import "./Dashboard.css";

// Status Colors Map
const STATUS_COLORS = {
    "Open": "#3498db",
    "In-Review": "#f1c40f",
    "In-Progress": "#9b59b6",
    "Action-Pending": "#e67e22",
    "Cancelled": "#e74c3c",
    "Resolved": "#2ecc71",
    "Comment": "#7f8c8d"
};

// ✅ Register required chart elements
ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
    const [navSize, setNavSize] = useState("full");
    const [tickets, setTickets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [ticketFilter, setTicketFilter] = useState("All");
    const [employeeFilter, setEmployeeFilter] = useState("All");

    useEffect(() => {
        fetchTickets();
        fetchEmployees();
    }, []);

    const fetchTickets = async () => {
        const res = await apiFetch(`/api/tickets/all`);
        const data = await res.json();
        setTickets(data);
    };

    const fetchEmployees = async () => {
        const res = await apiFetch(`/api/employee/all`);
        const data = await res.json();
        setEmployees(data);
    };

    // Filtered data
    const filteredTickets = ticketFilter === "All" ? tickets : tickets.filter(t => t.category === ticketFilter);
    const filteredEmployees = employeeFilter === "All" ? employees : employees.filter(e => e.emp_department === employeeFilter);

    // Pie data
    const ticketStatuses = [...new Set(filteredTickets.map(t => t.ticket_status))];

    const ticketChartData = {
        labels: ticketStatuses,
        datasets: [
            {
                data: ticketStatuses.map(status => filteredTickets.filter(t => t.ticket_status === status).length),
                backgroundColor: ticketStatuses.map(status => STATUS_COLORS[status] || "#cccccc"),
            },
        ],
    };

    const departments = [...new Set(filteredEmployees.map(e => e.emp_department))];

    const employeeChartData = {
        labels: departments,
        datasets: [
            {
                data: departments.map(dept => filteredEmployees.filter(e => e.emp_department === dept).length),
                backgroundColor: ["#3498db", "#9b59b6", "#2ecc71", "#e67e22", "#e74c3c"], // Custom colors
            },
        ],
    };

    return (
        <div className="dashboard-container">
            <LeftNavbar navSize={navSize} setNavSize={setNavSize} />

            <div className={`dashboard-content ${navSize}`}>

                {/* LEFT SIDE - TICKETS */}
                <div className="dashboard-section">
                    <h2>Ticket Dashboard</h2>

                    <select value={ticketFilter} onChange={e => setTicketFilter(e.target.value)}>
                        <option>All</option>
                        <option>IT</option>
                        <option>HR</option>
                    </select>

                    <div className="chart-wrapper">
                        <Pie data={ticketChartData} />
                    </div>
                </div>

                {/* RIGHT SIDE - EMPLOYEES */}
                <div className="dashboard-section">
                    <h2>Employee Dashboard</h2>

                    <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
                        <option>All</option>
                        <option>IT</option>
                        <option>Development</option>
                        <option>HR</option>
                    </select>

                    <div className="chart-wrapper">
                        <Pie data={employeeChartData} />
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Dashboard;
