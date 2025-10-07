import React, { useState, useEffect } from "react";
import LeftNavbar from "./left_navbar";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "./utils/api";
import { Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";
import Select, { components } from "react-select";
import { FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo_eagle from "./assets/img/logo_eagle.png";
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

ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
    const [navSize, setNavSize] = useState("full");
    const [tickets, setTickets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [ticketFilter, setTicketFilter] = useState([]);
    const [employeeFilter, setEmployeeFilter] = useState([]);
    const filterableColumns = ["ticket_status", "category"];
    const [loggedInEmp, setLoggedInEmp] = useState(null);
    const [empId, setEmpId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const id = localStorage.getItem("emp_id");
        setEmpId(id);
    }, []);

    useEffect(() => {
        if (empId && employees.length > 0) {
            const emp = employees.find(e => e.emp_id == empId);
            if (emp) {
                setLoggedInEmp(emp);
                if (emp.emp_access_level !== "Admin") {
                    navigate("/login");
                }
            }
        }
    }, [empId, employees]);

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

    // Custom Option component with checkbox
    const CheckboxOption = (props) => (
        <components.Option {...props}>
            <input
                type="checkbox"
                checked={props.isSelected}
                onChange={() => null}
                style={{ marginRight: 8, width: "16px", height: "16px", transform: "scale(1.2)" }}
            />
            <label>{props.label}</label>
        </components.Option>
    );

    const filterableFields = ["emp_department", "category", "priority_level", "contact_method", "ticket_status"];
    const employeeFilterableFields = ["emp_department", "emp_type", "emp_location", "is_active"];

    const getOptions = (key) => {
        if (!tickets.length) return [];
        const unique = [...new Set(tickets.map(t => t[key]))].filter(Boolean);
        return unique.map(u => ({ value: u, label: u }));
    };

    const getEmployeeOptions = (key) => {
        if (!employees.length) return [];

        let unique;
        if (key === "is_active") {
            // Map 1 => Yes, 0 => No
            unique = [...new Set(employees.map(e => e[key] === 1 ? "Yes" : "No"))].filter(Boolean);
        } else {
            unique = [...new Set(employees.map(e => e[key]))].filter(Boolean);
        }

        return unique.map(u => ({ value: u, label: u }));
    };

    const filteredTickets = tickets.filter((t) => {
        if (!ticketFilter.length) return true;

        return ticketFilter.every(f => {
            // Check if ticket matches at least one filter for each selected field
            return filterableFields.some(field => t[field] === f.value);
        });
    });

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

    const departments = [...new Set(employees.map(e => e.emp_department))];

    const filteredEmployees = employees.filter((e) => {
        if (!employeeFilter.length) return true;

        return employeeFilter.every(f => {
            if (f.field === "is_active") {
                const isActiveLabel = e.is_active === 1 ? "Yes" : "No";
                return isActiveLabel === f.value;
            }
            return e[f.field] === f.value;
        });
    });

    const employeeChartData = {
        labels: departments,
        datasets: [
            {
                data: departments.map(dept => filteredEmployees.filter(e => e.emp_department === dept).length),
                backgroundColor: ["#3498db", "#9b59b6", "#2ecc71", "#e67e22", "#e74c3c"],
            },
        ],
    };

    // ----- Export functions -----
    const exportTicketsToPDF = () => exportToPDF(filteredTickets);
    const exportTicketsToExcel = () => exportToExcel(filteredTickets);

    const exportEmployeesToPDF = () => exportToPDF(filteredEmployees, true);
    const exportEmployeesToExcel = () => exportToExcel(filteredEmployees, true);

    // Reusable export functions (tickets or employees)
    const exportToPDF = (data, isEmployee = false) => {
        if (!data || data.length === 0) return alert("No data available to export.");
        const doc = new jsPDF("landscape");
        const pageWidth = doc.internal.pageSize.getWidth();

        const headers = isEmployee
            ? ["Name", "Email", "Department", "Type", "Location"]
            : ["Ticket ID", "Employee", "Email", "Department", "Category", "Priority", "Contact Method", "Subject", "Attachment", "Status", "Created Date & Time"];

        const body = data.map(item => isEmployee
            ? [item.emp_name, item.emp_mail_id, item.emp_department, item.emp_type, item.emp_location]
            : [item.ticket_id, item.emp_name, item.emp_mail_id, item.emp_department, item.category, item.priority_level, item.contact_method, item.subject, item.attachment_file ? "Yes" : "No", item.ticket_status, new Date(item.created_time).toLocaleString()]
        );

        autoTable(doc, {
            head: [headers],
            body: body,
            startY: 50,
            margin: { top: 50 },
            theme: "grid",
            styles: { fontSize: 7, cellWidth: "wrap", overflow: "linebreak" },
            headStyles: { halign: "center" },
            didDrawPage: function () {
                const imgWidth = 40;
                const imgHeight = 20;
                const imgX = (pageWidth - imgWidth) / 2;
                doc.addImage(logo_eagle, "PNG", imgX, 5, imgWidth, imgHeight);
                doc.setFontSize(13);
                doc.text(isEmployee ? "Employees Report" : "Tickets Report", pageWidth / 2, 30, { align: "center" });
                doc.setFontSize(9);
                doc.text("Generated by dAssist", pageWidth / 2, 38, { align: "center" });
            }
        });

        doc.save(isEmployee ? "Employees_Report.pdf" : "Tickets_Report.pdf");
    };

    const exportToExcel = async (data, isEmployee = false) => {
        if (!data || data.length === 0) return alert("No data available to export.");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(isEmployee ? "Employees" : "Tickets");

        // Add logo_eagle
        const imageResponse = await fetch(logo_eagle);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        const imageId = workbook.addImage({ buffer: imageBuffer, extension: "png" });
        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });

        let rowOffset = 4;
        worksheet.getCell(`A${rowOffset}`).value = isEmployee ? "Employees Report" : "Tickets Report";
        worksheet.getCell(`A${rowOffset + 1}`).value = "Generated by dAssist";

        const headers = isEmployee
            ? ["Name", "Email", "Department", "Type", "Location"]
            : ["Ticket ID", "Employee", "Email", "Department", "Category", "Priority", "Contact Method", "Subject", "Attachment", "Status", "Created Date & Time"];

        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "8DB4E2" } };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        });

        data.forEach(item => {
            const row = isEmployee
                ? [item.emp_name, item.emp_mail_id, item.emp_department, item.emp_type, item.emp_location]
                : [item.ticket_id, item.emp_name, item.emp_mail_id, item.emp_department, item.category, item.priority_level, item.contact_method, item.subject, item.attachment_file ? item.attachment_file.split("/").pop() : "No File", item.ticket_status, new Date(item.created_time).toLocaleString()];
            const dataRow = worksheet.addRow(row);
            dataRow.eachCell((cell) => {
                cell.alignment = { vertical: "top", wrapText: true };
                cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
            });
        });

        worksheet.columns.forEach(col => {
            let maxLength = 10;
            col.eachCell({ includeEmpty: true }, cell => {
                const len = cell.value ? cell.value.toString().length : 10;
                maxLength = Math.max(maxLength, len + 2);
            });
            col.width = Math.min(maxLength, 40);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = isEmployee ? "Employees_Report.xlsx" : "Tickets_Report.xlsx";
        link.click();
    };

    return (
        <div className="dashboard-container">
            <LeftNavbar navSize={navSize} setNavSize={setNavSize} />
            <div className={`dashboard-content ${navSize}`}>
                {/* Ticket Dashboard */}
                <div className="dashboard-section">
                    <div className="dashboard-section-header">
                        <h2>Ticket Dashboard</h2>
                        <div className="export-icons">
                            <FaDownload size={20} title="Download" />
                            <FaFilePdf size={24} color="#e74c3c" title="Export PDF" onClick={exportTicketsToPDF} />
                            <FaFileExcel size={24} color="#27ae60" title="Export Excel" onClick={exportTicketsToExcel} />
                        </div>
                    </div>

                    <div className="filters-row ticket-filters">
                        {filterableFields.map(field => (
                            <Select
                                key={field}
                                placeholder={`Filter by ${field.replace("_", " ")}`}
                                options={getOptions(field)}
                                value={ticketFilter.filter(f => f.field === field)}
                                onChange={(vals) => {
                                    const newFilters = ticketFilter.filter(f => f.field !== field);
                                    if (vals) {
                                        vals.forEach(v => v.field = field);
                                        newFilters.push(...vals);
                                    }
                                    setTicketFilter(newFilters);
                                }}
                                isMulti
                                closeMenuOnSelect={false}
                                components={{ Option: CheckboxOption }}
                                styles={{ container: (provided) => ({ ...provided, minWidth: 200, flex: "1 1 250px" }) }}
                            />
                        ))}
                    </div>

                    <div className="chart-wrapper big-chart">
                        <Pie data={ticketChartData} />
                    </div>
                </div>

                {/* Employee Dashboard */}
                <div className="dashboard-section">
                    <div className="dashboard-section-header">
                        <h2>Employee Dashboard</h2>
                        <div className="export-icons">
                            <FaDownload size={20} title="Download" />
                            <FaFilePdf size={24} color="#e74c3c" title="Export PDF" onClick={exportEmployeesToPDF} />
                            <FaFileExcel size={24} color="#27ae60" title="Export Excel" onClick={exportEmployeesToExcel} />
                        </div>
                    </div>

                    <div className="filters-row employee-filters">
                        {employeeFilterableFields.map(field => (
                            <Select
                                key={field}
                                placeholder={`Filter by ${field.replace("_", " ")}`}
                                options={getEmployeeOptions(field)}
                                value={employeeFilter.filter(f => f.field === field)}
                                onChange={(vals) => {
                                    const newFilters = employeeFilter.filter(f => f.field !== field);
                                    if (vals) {
                                        vals.forEach(v => v.field = field);
                                        newFilters.push(...vals);
                                    }
                                    setEmployeeFilter(newFilters);
                                }}
                                isMulti
                                closeMenuOnSelect={false}
                                components={{ Option: CheckboxOption }}
                                styles={{ container: (provided) => ({ ...provided, minWidth: 200, flex: "1 1 250px" }) }}
                            />
                        ))}
                    </div>

                    <div className="chart-wrapper big-chart">
                        <Pie data={employeeChartData} />
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Dashboard;
