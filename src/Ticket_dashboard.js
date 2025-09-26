import React, { useEffect, useState, useRef } from "react";
import Select, { components } from "react-select";
import LOGO from "./assets/img/LOGO.png";
import { apiFetch, API_BASE } from "./utils/api";
import { useNavigate } from "react-router-dom";
import { FaPaperclip, FaInfoCircle, FaFilePdf, FaFileExcel, FaDownload, FaSpinner } from "react-icons/fa";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import "./Ticket_dashboard.css";

function TicketDashboard() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 6;

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [ticketStatus, setTicketStatus] = useState("");
    const [comments, setComments] = useState("");
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [originalStatus, setOriginalStatus] = useState("");
    const isStatusChanged = ticketStatus !== originalStatus;
    const [statusSaved, setStatusSaved] = useState(false);
    const [sendingMail, setSendingMail] = useState(false);
    const [history, setHistory] = useState([]);

    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowStatusMenu(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await apiFetch(`/api/tickets/all`);
            const data = await res.json();
            setTickets(data);
        } catch (err) {
            console.error("Error fetching tickets:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (ticketId) => {
        try {
            const res = await apiFetch(`/api/tickets/ticket_history/${ticketId}`);
            const data = await res.json();
            setHistory(data);
            console.log("History data:", data);
        } catch (err) {
            console.error("Error fetching history:", err);
        }
    };

    useEffect(() => {
        const accessLevel = localStorage.getItem("emp_access_level");
        if (accessLevel !== "admin") {
            navigate("/login");
            return;
        }
        fetchTickets();
    }, [navigate]);

    // Filter selector options
    const filterOptions = [
        { value: "ticket_id", label: "Ticket ID" },
        { value: "emp_name", label: "Employee Name" },
        { value: "emp_department", label: "Department" },
        { value: "category", label: "Category" },
        { value: "priority_level", label: "Priority" },
        { value: "contact_method", label: "Contact Method" },
        { value: "subject", label: "Subject" },
        { value: "ticket_status", label: "Ticket Status" },
        { value: "created_time", label: "Created Date" },
    ];

    // State to track selected filter type
    const [selectedFilter, setSelectedFilter] = useState("ticket_id");

    // Define which columns to add filters for
    const filterableColumns = [
        "ticket_id",
        "emp_name",
        "emp_department",
        "category",
        "priority_level",
        "contact_method",
        "subject",
        "ticket_status",
        "created_time",
    ];

    // Dynamic filters state
    const [filters, setFilters] = useState(
        filterableColumns.reduce((acc, col) => ({ ...acc, [col]: [] }), {})
    );


    // Custom Option component with checkbox
    const CheckboxOption = (props) => {
        return (
            <components.Option {...props}>
                <input
                    type="checkbox"
                    checked={props.isSelected}
                    onChange={() => null}
                    style={{
                        marginRight: 8,
                        width: "14px",
                        height: "14px",
                        transform: "scale(1.2)",
                        cursor: "pointer"
                    }}
                />
                <label style={{ cursor: "pointer" }}>{props.label}</label>
            </components.Option>
        );
    };

    // Function to get options for each column dynamically
    const getOptions = (key) => {
        if (key === "created_time") {
            const uniqueDates = [...new Set(tickets.map(t => new Date(t.created_time).toISOString().split('T')[0]))];
            return uniqueDates.map(date => ({ value: date, label: date }));
        } else {
            const unique = [...new Set(tickets.map(t => t[key]))].filter(Boolean);
            return unique.map(u => ({ value: u, label: u }));
        }
    };

    // Filter tickets
    const filteredTickets = tickets.filter((t) =>
        filterableColumns.every((col) => {
            if (!filters[col] || filters[col].length === 0) return true;

            if (col === "created_time") {
                const ticketDate = new Date(t.created_time).toISOString().split("T")[0];
                return filters[col].some(f => f.value === ticketDate);
            }

            return filters[col].some(f => f.value === t[col]);
        })
    );

    // ✅ Pagination
    const totalPages = Math.ceil(filteredTickets.length / rowsPerPage);
    const paginatedTickets = filteredTickets.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const saveTicketStatus = async () => {
        if (!selectedTicket) return;

        const payload = {
            ticket_id: selectedTicket.ticket_id,
            ticket_status: ticketStatus,
            ticket_comments: comments,
            updated_by: localStorage.getItem("emp_id")
        };

        try {
            // Call backend to save status
            const res = await apiFetch("/api/tickets/save_status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Save failed");

            // Update localStorage table
            const localTickets = JSON.parse(localStorage.getItem("tickets") || "[]");
            const ticketIndex = localTickets.findIndex(t => t.ticket_id === selectedTicket.ticket_id);
            if (ticketIndex !== -1) {
                localTickets[ticketIndex].ticket_status = ticketStatus;
                localTickets[ticketIndex].ticket_comments = comments;
            }
            localStorage.setItem("tickets", JSON.stringify(localTickets));

            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Ticket status updated successfully!"
            });

            setStatusSaved(true);
            fetchTickets();
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.message
            });
        }
    };

    // 🔹 Function to send ticket status email
    const sendTicketStatusMail = async (ticketId) => {
        if (!ticketId) return;
        setSendingMail(true); // start loader

        try {
            const res = await apiFetch("/api/tickets/send_status_mail", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticket_id: ticketId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to send mail");

            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Email sent to employee successfully!",
            });

            setStatusSaved(false);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.message,
            });
        } finally {
            setSendingMail(false);
        }
    };

    const exportToPDF = (tickets) => {
        if (!tickets || tickets.length === 0) {
            alert("No tickets available to export.");
            return;
        }

        const doc = new jsPDF("landscape");
        const pageWidth = doc.internal.pageSize.getWidth();

        autoTable(doc, {
            head: [[
                "Ticket ID", "Employee", "Email", "Department", "Category", "Priority",
                "Contact Method", "Subject", "Attachment", "Status", "Created Date & Time"
            ]],
            body: tickets.map(ticket => [
                ticket.ticket_id,
                ticket.emp_name,
                ticket.emp_mail_id,
                ticket.emp_department,
                ticket.category,
                ticket.priority_level,
                ticket.contact_method,
                ticket.subject,
                ticket.attachment_file ? ticket.attachment_file.split("/").pop() : "No File",
                ticket.ticket_status,
                new Date(ticket.created_time).toLocaleString(),
            ]),
            startY: 50,
            margin: { top: 50 },
            theme: "grid",
            styles: {
                fontSize: 7,
                cellWidth: "wrap",
                overflow: "linebreak",
            },
            headStyles: { halign: "center" },
            didDrawPage: function () {
                const imgWidth = 40;
                const imgHeight = 20;
                const imgX = (pageWidth - imgWidth) / 2;
                doc.addImage(LOGO, "PNG", imgX, 5, imgWidth, imgHeight);

                doc.setFontSize(13);
                doc.text("Tickets Report", pageWidth / 2, 30, { align: "center" });

                doc.setFontSize(9);
                doc.text("Generated by dAssist", pageWidth / 2, 38, { align: "center" });
            },
        });

        doc.save("Tickets_Report.pdf");
    };

    const exportToExcel = async (tickets) => {
        if (!tickets || tickets.length === 0) {
            alert("No tickets available to export.");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tickets");

        // ✅ Add Logo
        const imageResponse = await fetch(LOGO);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();

        const imageId = workbook.addImage({
            buffer: imageBuffer,
            extension: "png",
        });

        worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 120, height: 60 },
        });

        let rowOffset = 4;

        worksheet.getCell(`A${rowOffset}`).value = `Tickets Report`;
        worksheet.getCell(`A${rowOffset + 1}`).value = `Generated by dAssist`;

        // ✅ Headers
        const headers = [
            "Ticket ID", "Employee", "Email", "Department", "Category", "Priority",
            "Contact Method", "Subject", "Attachment", "Status", "Created Date & Time"
        ];

        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "8DB4E2" },
            };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            };
        });

        // ✅ Data Rows
        tickets.forEach((ticket) => {
            const row = [
                ticket.ticket_id,
                ticket.emp_name,
                ticket.emp_mail_id,
                ticket.emp_department,
                ticket.category,
                ticket.priority_level,
                ticket.contact_method,
                ticket.subject,
                ticket.attachment_file ? ticket.attachment_file.split("/").pop() : "No File",
                ticket.ticket_status,
                new Date(ticket.created_time).toLocaleString(),
            ];

            const dataRow = worksheet.addRow(row);
            dataRow.eachCell((cell) => {
                cell.alignment = { vertical: "top", wrapText: true };
                cell.border = {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                };
            });
        });

        worksheet.columns.forEach((col) => {
            let maxLength = 10;
            col.eachCell({ includeEmpty: true }, (cell) => {
                const len = cell.value ? cell.value.toString().length : 10;
                maxLength = Math.max(maxLength, len + 2);
            });
            col.width = Math.min(maxLength, 40);
        });

        // ✅ Download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Tickets_Report.xlsx`;
        link.click();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Open":
                return "#3498db";
            case "In Review":
                return "#f1c40f";
            case "In Progress":
                return "#9b59b6";
            case "Action Pending":
                return "#e67e22";
            case "Cancelled":
                return "#e74c3c";
            case "Resolved":
                return "#2ecc71";
            default:
                return "#333";
        }
    };

    if (loading) return <p>Loading tickets...</p>;

    return (
        <div className="ticket-dashboard">
            <h2 style={{ marginLeft: "30px", marginBottom: "-10px" }}>
                <a className="navbar-brand" href="#">
                    <img
                        src={LOGO}
                        alt="dassist Logo"
                        style={{
                            height: "80px",
                            objectFit: "contain",
                            marginLeft: "-20px",
                            marginRight: "-20px",
                        }}
                    />
                </a>
                Ticket Dashboard
            </h2>

            {/* Filters */}
            <div style={{ display: "flex", margin: "28px 40px", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                    {/* Filter type selector - unchanged */}
                    <Select
                        options={filterOptions}
                        value={filterOptions.find(f => f.value === selectedFilter)}
                        onChange={(val) => {
                            setSelectedFilter(val.value);
                            setFilters(prev => ({ ...prev, [val.value]: [] }));
                            setCurrentPage(1);
                        }}
                        placeholder="Select Filter"
                        isSearchable
                        styles={{ container: (provided) => ({ ...provided, width: 220 }) }}
                    />

                    {/* Second dropdown with checkboxes */}
                    <Select
                        placeholder={`Filter by ${filterOptions.find(f => f.value === selectedFilter).label}`}
                        options={getOptions(selectedFilter)}
                        value={filters[selectedFilter]}
                        onChange={(vals) => {
                            setFilters(prev => ({ ...prev, [selectedFilter]: vals || [] }));
                            setCurrentPage(1);
                        }}
                        closeMenuOnSelect={false}
                        isMulti
                        isClearable
                        components={{ Option: CheckboxOption }}
                        styles={{
                            container: (provided) => ({ ...provided, width: 250 }),
                            multiValue: (provided) => ({ ...provided, backgroundColor: "#e0e0e0" }),
                            option: (provided, state) => ({
                                ...provided,
                                display: "flex",
                                alignItems: "center",
                            }),
                        }}
                    />
                </div>

                {/* Export buttons */}
                <div style={{ display: "flex", gap: "15px", marginRight: "5px", alignItems: "center" }}>
                    <FaDownload
                        size={20}
                        style={{ marginRight: "6px", color: "#333", alignSelf: "flex-end", marginBottom: "0px" }}
                        title="Download"
                    />
                    <FaFilePdf
                        size={24}
                        color="#e74c3c"
                        style={{ cursor: "pointer" }}
                        title="Export as PDF"
                        onClick={() => exportToPDF(filteredTickets)}
                    />
                    <FaFileExcel
                        size={24}
                        color="#27ae60"
                        style={{ cursor: "pointer" }}
                        title="Export as Excel"
                        onClick={() => exportToExcel(filteredTickets)}
                    />
                </div>
            </div>

            <div className="table-wrapper">
                <table className="ticket-table">
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Employee</th>
                            <th>Email</th>
                            <th>Department</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Contact Method</th>
                            <th>Subject</th>
                            <th>Attachments</th>
                            <th>Status</th>
                            <th>Created Date & Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTickets.length > 0 ? (
                            paginatedTickets.map((ticket) => (
                                <tr key={ticket.ticket_id}>
                                    <td>
                                        <a
                                            href="#!"
                                            style={{ color: "#4a90e2", cursor: "pointer", fontWeight: "500" }}
                                            onClick={() => {
                                                setSelectedTicket(ticket);
                                                setTicketStatus(ticket.ticket_status);
                                                setOriginalStatus(ticket.ticket_status);
                                                setComments("");
                                                fetchHistory(ticket.ticket_id);
                                                setShowModal(true);
                                            }}
                                        >
                                            {ticket.ticket_id}
                                        </a>
                                    </td>
                                    <td>{ticket.emp_name}</td>
                                    <td>{ticket.emp_mail_id}</td>
                                    <td>{ticket.emp_department}</td>
                                    <td>{ticket.category}</td>
                                    <td>{ticket.priority_level}</td>
                                    <td>{ticket.contact_method}</td>
                                    <td>{ticket.subject}</td>
                                    <td style={{ textAlign: "center" }}>
                                        {ticket.attachment_file ? (
                                            <a
                                                href={`${API_BASE}/Tickets_file_uploads/${ticket.attachment_file.replace(/\\/g, "/").split("/").pop()}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: "#4a90e2", fontSize: "18px" }}
                                                title={ticket.attachment_file.replace(/\\/g, "/").split("/").pop()}
                                            >
                                                <FaPaperclip />
                                            </a>
                                        ) : (
                                            <span style={{ color: "#999" }}>No File</span>
                                        )}
                                    </td>
                                    <td
                                        style={{
                                            color: getStatusColor(ticket.ticket_status),
                                            textAlign: 'center',
                                            fontWeight: '500',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                        }}
                                    >
                                        {ticket.ticket_status}
                                    </td>
                                    <td>{new Date(ticket.created_time).toLocaleString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="11" style={{ textAlign: "center" }}>
                                    No tickets found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
                <button className="pagination_btn" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                    Previous
                </button>
                <span style={{ marginTop: "8px" }}>
                    Page {currentPage} of {totalPages}
                </span>
                <button className="pagination_btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                    Next
                </button>
            </div>

            {showModal && selectedTicket && (
                <div className="ticket-modal-overlay" onClick={() => {
                    setShowModal(false);
                    setShowStatusMenu(false);
                }}>
                    <div
                        className="ticket-modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ position: "relative" }}
                    >
                        {/* Close Icon */}
                        <div
                            className="close-icon"
                            onClick={() => setShowModal(false)}
                            title="Close"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </div>

                        {/* Left panel */}
                        <div className="modal-left">
                            <h3 style={{ marginBottom: "15px", color: "#333" }}>Ticket Details</h3>
                            <div className="ticket-detail-list">
                                <div className="detail-item">
                                    <span className="label">Employee:</span>
                                    <span className="value">{selectedTicket.emp_name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Email:</span>
                                    <span className="value">{selectedTicket.emp_mail_id}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Department:</span>
                                    <span className="value">{selectedTicket.emp_department}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Category:</span>
                                    <span className="value">{selectedTicket.category}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Priority:</span>
                                    <span className="value priority">{selectedTicket.priority_level}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Contact:</span>
                                    <span className="value">{selectedTicket.contact_method}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Subject:</span>
                                    <span className="value">{selectedTicket.subject}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Description:</span>
                                    <span className="value description">{selectedTicket.description}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right panel */}
                        <div className="modal-right">
                            {/* Status Row */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontWeight: "600", color: "#333" }}>Status:</span>
                                <div className="status-dropdown-container" ref={dropdownRef} style={{ flex: 1 }}>
                                    <button
                                        className={`status-dropdown-button status-${ticketStatus.replace(/\s/g, '-')}`}
                                        onClick={() => setShowStatusMenu(prev => !prev)}
                                    >
                                        {ticketStatus} <span className="arrow">{showStatusMenu ? "▲" : "▼"}</span>
                                    </button>

                                    {showStatusMenu && (
                                        <div className="status-dropdown-menu">
                                            {["Open", "In Review", "In Progress", "Action Pending", "Cancelled", "Resolved"]
                                                .filter(status => status !== ticketStatus)
                                                .map(status => (
                                                    <div
                                                        key={status}
                                                        className={`status-dropdown-item status-${status.replace(/\s/g, '-')}`}
                                                        onClick={() => {
                                                            setTicketStatus(status);
                                                            setShowStatusMenu(false);
                                                        }}
                                                    >
                                                        {status}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Comments */}
                            <h4>Comments:</h4>
                            <textarea
                                placeholder="Add comments..."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                            />

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                <button
                                    className="send-mail-btn"
                                    style={{ backgroundColor: "#28a745" }}
                                    onClick={saveTicketStatus}
                                    disabled={!isStatusChanged}
                                >
                                    Save
                                </button>

                                <button
                                    className="send-mail-btn"
                                    onClick={() => sendTicketStatusMail(selectedTicket?.ticket_id)}
                                    disabled={!statusSaved || sendingMail}
                                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                                >
                                    {sendingMail ? (
                                        <>
                                            <FaSpinner className="spin" /> Sending...
                                        </>
                                    ) : (
                                        "Send Mail"
                                    )}
                                </button>

                                {statusSaved && (
                                    <div
                                        title={`This will send the latest status: "${ticketStatus}" and comments to the ticket creator.`}
                                        style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#555" }}
                                    >
                                        <FaInfoCircle />
                                    </div>
                                )}
                            </div>

                            {/* History Section */}
                            <div className="history-section">
                                <h4 style={{ marginBottom: "15px" }}>History</h4>
                                <div className="history-timeline">
                                    {history.length > 0 ? (
                                        history.map((h, index) => (
                                            <div
                                                key={index}
                                                className={`history-item status-${h.ticket_status.replace(/\s+/g, "-")}`}
                                            >
                                                <div className="history-status">
                                                    <span className="label">Status:</span> {h.ticket_status}
                                                </div>
                                                <div className="history-meta">
                                                    <span className="label">Updated By:</span> {h.emp_name}
                                                    <span className="label">Time:</span>{" "}
                                                    {new Date(h.updated_time).toLocaleString()}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p>No history available.</p>
                                    )}
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default TicketDashboard;
