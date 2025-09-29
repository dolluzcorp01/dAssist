import React, { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import { FaFilePdf, FaFileExcel, FaUserPlus, FaEdit, FaTrash, FaDownload, FaCamera } from "react-icons/fa";
import LeftNavbar from "./left_navbar";
import Select, { components } from "react-select";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { apiFetch, API_BASE } from "./utils/api";
import LOGO from "./assets/img/LOGO.png";
import "./Employee_Center.css";

function Employee_Center() {
    const [navSize, setNavSize] = useState("full");
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);

    const [showEmpMenu, setShowEmpMenu] = useState(false);
    const [loggedInEmp, setLoggedInEmp] = useState(null);

    const [isDropdownHovered, setIsDropdownHovered] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const dropdownRef = useRef(null);
    const empDropdownRef = useRef(null);
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);

    const [empId, setEmpId] = useState(null);

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

    const fetchEmployees = async () => {
        try {
            const res = await apiFetch(`/api/employee/all`);
            const data = await res.json();
            setEmployees(data);
        } catch (err) {
            console.error("Error fetching employees:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const [formData, setFormData] = useState({
        emp_name: "",
        emp_mail_id: "",
        account_pass: "",
        emp_mobile_no: "",
        emp_department: "",
        emp_type: "",
        emp_location: "",
        emp_access_level: "",
    });

    const departments = ["Development", "Testing", "HR", "Support"];
    const types = ["Full Time", "Part Time", "Contract"];
    const locations = ["Chennai", "Hyderabad", "Pune", "Nagpur"];
    const accessLevels = ["Admin", "User"];

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Filters
    const filterOptions = [
        { value: "emp_name", label: "Name" },
        { value: "emp_mail_id", label: "Email" },
        { value: "account_pass", label: "Account Password" },
        { value: "emp_department", label: "Department" },
        { value: "emp_type", label: "Type" },
        { value: "emp_location", label: "Location" },
        { value: "emp_access_level", label: "Access Level" },
    ];

    const filterableColumns = filterOptions.map(f => f.value);
    const [selectedFilter, setSelectedFilter] = useState("emp_name");
    const [filters, setFilters] = useState(
        filterableColumns.reduce((acc, col) => ({ ...acc, [col]: [] }), {})
    );

    const CheckboxOption = (props) => (
        <components.Option {...props}>
            <input
                type="checkbox"
                checked={props.isSelected}
                onChange={() => null}
                style={{ marginRight: 8, width: 14, height: 14, transform: "scale(1.2)", cursor: "pointer" }}
            />
            <label style={{ cursor: "pointer" }}>{props.label}</label>
        </components.Option>
    );

    const getOptions = (key) => {
        const unique = [...new Set(employees.map(t => t[key]))].filter(Boolean);
        return unique.map(u => ({ value: u, label: u }));
    };

    const MAX_FILE_SIZE = 0.5 * 1024 * 1024; // 0.5 MB in bytes

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // ✅ Check file size
        if (file.size > MAX_FILE_SIZE) {
            Swal.fire({
                icon: "warning",
                title: "File Too Large",
                text: "Please select an image smaller than 0.5 MB.",
            });
            // Reset selected file and input
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setSelectedFile(file);
    };

    const handleSaveProfileImage = async () => {
        if (!selectedFile) {
            Swal.fire({
                icon: "warning",
                title: "No File Selected",
                text: "Please select a profile image before saving.",
            });
            return;
        }

        // ✅ Optional: double-check file size before sending
        if (selectedFile.size > MAX_FILE_SIZE) {
            Swal.fire({
                icon: "warning",
                title: "File Too Large",
                text: "Please select an image smaller than 0.5 MB.",
            });
            return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append("profile", selectedFile);

        try {
            const res = await apiFetch(`/api/employee/upload-profile/${empId}`, {
                method: "POST",
                body: formDataToSend,
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to upload profile image");

            Swal.fire({
                icon: "success",
                title: "Profile Updated",
                text: "Your profile image has been updated successfully!",
            });

            // Update logged in user state
            setLoggedInEmp(prev => ({ ...prev, emp_profile_img: data.profilePath }));

            // Reset file input
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = null;

        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Upload Error",
                text: err.message,
            });
        }
    };

    function stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = "#";
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xff;
            color += ("00" + value.toString(16)).slice(-2);
        }
        return color;
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "emp_mobile_no") {
            // Remove any non-digit characters
            const numericValue = value.replace(/\D/g, "");
            setFormData((prev) => ({ ...prev, [name]: numericValue }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        const newErrors = {};

        // 1️⃣ Name
        if (!formData.emp_name) {
            newErrors.emp_name = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Name is required", "error");
            return;
        }

        // 2️⃣ Email
        if (!formData.emp_mail_id) {
            newErrors.emp_mail_id = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Email is required", "error");
            return;
        } else if (!formData.emp_mail_id.endsWith("@dolluzcorp.com")) {
            newErrors.emp_mail_id = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Email must end with @dolluzcorp.com", "error");
            return;
        }

        // 3️⃣ Mobile
        if (!formData.emp_mobile_no) {
            newErrors.emp_mobile_no = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Mobile is required", "error");
            return;
        } else if (formData.emp_mobile_no.length !== 10) {
            newErrors.emp_mobile_no = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Mobile must be 10 digits", "error");
            return;
        }

        // 4️⃣ Department
        if (!formData.emp_department) {
            newErrors.emp_department = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Department is required", "error");
            return;
        }

        // 5️⃣ Employee Type
        if (!formData.emp_type) {
            newErrors.emp_type = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Employee Type is required", "error");
            return;
        }

        // 6️⃣ Location
        if (!formData.emp_location) {
            newErrors.emp_location = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Location is required", "error");
            return;
        }

        // 7️⃣ Access Level
        if (!formData.emp_access_level) {
            newErrors.emp_access_level = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Access Level is required", "error");
            return;
        }

        // 8️⃣ Account Password (only for Admin)
        if (formData.emp_access_level === "Admin" && !formData.account_pass) {
            newErrors.account_pass = true;
            setErrors(newErrors);
            Swal.fire("Validation Error", "Account Password is required for Admin", "error");
            return;
        }

        // ✅ All validations pass
        setErrors({}); // clear errors

        const loggedInEmpId = localStorage.getItem("emp_id");
        if (!loggedInEmpId) {
            Swal.fire("Error", "Login session expired. Please login again.", "error");
            return;
        }

        const payload = {
            ...formData,
            created_by: loggedInEmpId,
            updated_by: loggedInEmpId
        };

        try {
            const url = editingEmp
                ? `/api/employee/update/${editingEmp.emp_id}`
                : `/api/employee/create`;

            const method = editingEmp ? "PUT" : "POST";

            const response = await apiFetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = typeof response.json === "function" ? await response.json() : response;

            if (data.error) throw new Error(data.error);

            Swal.fire("Success", editingEmp ? "Employee updated" : "Employee added", "success");

            setShowModal(false);
            setFormData({
                emp_name: "", emp_mail_id: "", account_pass: "", emp_mobile_no: "",
                emp_department: "", emp_type: "", emp_location: "", emp_access_level: ""
            });
            setEditingEmp(null);
            fetchEmployees();
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const handleDelete = async (id) => {
        const loggedInEmpId = localStorage.getItem("emp_id");

        Swal.fire({
            title: "Are you sure?",
            text: "This will mark the employee as deleted.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await apiFetch(`/api/employee/delete/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ deleted_by: loggedInEmpId })
                    });
                    Swal.fire("Deleted!", "Employee has been deleted.", "success");
                    fetchEmployees();
                } catch (err) {
                    Swal.fire("Error", "Failed to delete employee", "error");
                }
            }
        });
    };

    const openEditModal = (emp) => {
        setEditingEmp(emp);
        setFormData(emp);
        setShowModal(true);
    };

    const filteredEmployees = employees.filter(emp =>
        filterableColumns.every(col => {
            if (!filters[col] || filters[col].length === 0) return true;
            return filters[col].some(f => f.value === emp[col]);
        })
    );

    const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const exportEmployeesToPDF = (employees) => {
        if (!employees || employees.length === 0) {
            alert("No employees available to export.");
            return;
        }

        const doc = new jsPDF("landscape");
        const pageWidth = doc.internal.pageSize.getWidth();

        autoTable(doc, {
            head: [[
                "ID", "Name", "Email", "Mobile", "Department", "Type", "Location", "Access Level"
            ]],
            body: employees.map(emp => [
                emp.emp_id,
                emp.emp_name,
                emp.emp_mail_id,
                emp.emp_mobile_no,
                emp.emp_department,
                emp.emp_type,
                emp.emp_location,
                emp.emp_access_level
            ]),
            startY: 50,
            margin: { top: 50 },
            theme: "grid",
            styles: { fontSize: 8, cellWidth: "wrap", overflow: "linebreak" },
            headStyles: { halign: "center" },
            didDrawPage: function () {
                const imgWidth = 40;
                const imgHeight = 20;
                const imgX = (pageWidth - imgWidth) / 2;
                doc.addImage(LOGO, "PNG", imgX, 5, imgWidth, imgHeight);

                doc.setFontSize(13);
                doc.text("Employees Report", pageWidth / 2, 30, { align: "center" });

                doc.setFontSize(9);
                doc.text("Generated by dAssist", pageWidth / 2, 38, { align: "center" });
            },
        });

        doc.save("Employees_Report.pdf");
    };


    const exportEmployeesToExcel = async (employees) => {
        if (!employees || employees.length === 0) {
            alert("No employees available to export.");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Employees");

        // Add Logo
        const imageResponse = await fetch(LOGO);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();

        const imageId = workbook.addImage({
            buffer: imageBuffer,
            extension: "png",
        });

        worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });

        let rowOffset = 4;

        worksheet.getCell(`A${rowOffset}`).value = "Employees Report";
        worksheet.getCell(`A${rowOffset + 1}`).value = "Generated by dAssist";

        // Headers
        const headers = ["ID", "Name", "Email", "Mobile", "Department", "Type", "Location", "Access Level"];
        const headerRow = worksheet.addRow(headers);

        headerRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "8DB4E2" } };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        });

        // Data Rows
        employees.forEach(emp => {
            const row = [
                emp.emp_id,
                emp.emp_name,
                emp.emp_mail_id,
                emp.emp_mobile_no,
                emp.emp_department,
                emp.emp_type,
                emp.emp_location,
                emp.emp_access_level
            ];

            const dataRow = worksheet.addRow(row);
            dataRow.eachCell(cell => {
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
        link.download = `Employees_Report.xlsx`;
        link.click();
    };


    return (
        <div className="employee-dashboard-container">
            <LeftNavbar navSize={navSize} setNavSize={setNavSize} />
            <div className={`employee-dashboard ${navSize}`}>
                <div className="header-wrapper">
                    <h2>
                        <a className="navbar-brand" href="#">
                            <img
                                src={LOGO}
                                alt="dassist Logo"
                                style={{
                                    height: "60px",
                                    objectFit: "contain",
                                    marginLeft: "-20px",
                                    marginRight: "-20px",
                                }}
                            />
                        </a>
                        Employee Center
                    </h2>

                    {/* Employee Circle */}
                    {loggedInEmp && (
                        <div className="emp-circle-container" ref={empDropdownRef}>
                            <div
                                className="emp-circle"
                                onClick={() => setShowEmpMenu(!showEmpMenu)}
                                style={{
                                    backgroundColor: loggedInEmp.emp_profile_img ? "transparent" : stringToColor(loggedInEmp.emp_name),
                                    color: "#fff",
                                    fontWeight: "bold",
                                    fontSize: "18px",
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    overflow: "hidden",
                                }}
                            >
                                {loggedInEmp.emp_profile_img ? (
                                    <img
                                        src={`${API_BASE}/${loggedInEmp.emp_profile_img.replace(/\\/g, "/")}`}
                                        alt="Profile"
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                ) : (
                                    loggedInEmp.emp_name.charAt(0).toUpperCase()
                                )}
                            </div>

                            {showEmpMenu && (
                                <div className="emp-dropdown">
                                    {/* Profile Info */}
                                    <div className="emp-profile">
                                        <div
                                            className="emp-profile-circle"
                                            style={{
                                                backgroundColor: loggedInEmp.emp_profile_img ? "transparent" : stringToColor(loggedInEmp.emp_name),
                                                color: "#fff",
                                                fontWeight: "bold",
                                                fontSize: "18px",
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                overflow: "hidden",
                                            }}
                                            onMouseEnter={() => setIsDropdownHovered(true)}
                                            onMouseLeave={() => setIsDropdownHovered(false)}
                                            onClick={() => setIsModalOpen(true)}
                                        >
                                            {loggedInEmp.emp_profile_img ? (
                                                <img
                                                    src={`${API_BASE}/${loggedInEmp.emp_profile_img.replace(/\\/g, "/")}`}
                                                    alt="Profile"
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                            ) : (
                                                isDropdownHovered ? <FaCamera color="white" /> : loggedInEmp.emp_name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        <div className="emp-profile-text">
                                            <div className="emp-name">{loggedInEmp.emp_name}</div>
                                            <div className="emp-org" style={{ fontStyle: "italic" }}>
                                                Your Form, Your Space
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropdown actions */}
                                    <button
                                        onClick={() => alert("Change Password clicked")}
                                        className="emp-dropdown-btn"
                                    >
                                        Change Password
                                    </button>
                                    <button
                                        onClick={() => { localStorage.clear(); window.location.reload(); }}
                                        className="emp-dropdown-btn logout-btn"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}

                            {isModalOpen && (
                                <div className="profile-modal-overlay">
                                    <div className="profile-modal" ref={modalRef}>
                                        <button
                                            className="profile-modal-close"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            ✖
                                        </button>

                                        <h3 className="profile-modal-title">Update Profile Image</h3>

                                        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                                            {selectedFile ? (
                                                <img
                                                    src={URL.createObjectURL(selectedFile)}
                                                    alt="Preview"
                                                    className="profile-image-preview"
                                                />
                                            ) : (
                                                <FaCamera size={60} color="#555" />
                                            )}
                                        </div>

                                        <div style={{ position: "relative", width: "100%" }}>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                style={{ width: "100%", paddingRight: selectedFile ? "30px" : "0" }}
                                            />

                                            {selectedFile && (
                                                <span
                                                    onClick={() => {
                                                        setSelectedFile(null);
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.value = "";
                                                        }
                                                    }}
                                                    style={{
                                                        position: "absolute",
                                                        right: "8px",
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        cursor: "pointer",
                                                        fontSize: "16px",
                                                        color: "#888",
                                                    }}
                                                >
                                                    ✖
                                                </span>
                                            )}
                                        </div>

                                        <div className="profile-modal-buttons">
                                            <button
                                                className="profile-modal-save"
                                                onClick={handleSaveProfileImage}
                                                disabled={!selectedFile}
                                                style={{
                                                    cursor: selectedFile ? "pointer" : "not-allowed",
                                                    opacity: selectedFile ? 1 : 0.5
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                <div className="employee-dashboard-content">
                    {/* Filters */}
                    <div className="employee-filters-container">
                        <div className="employee-filters-left">
                            <Select
                                options={filterOptions}
                                value={filterOptions.find(f => f.value === selectedFilter)}
                                onChange={val => {
                                    setSelectedFilter(val.value);
                                    setFilters(prev => ({ ...prev, [val.value]: [] }));
                                    setCurrentPage(1);
                                }}
                                placeholder="Select Filter"
                                isSearchable
                                styles={{ container: provided => ({ ...provided, width: 220 }) }}
                            />

                            <Select
                                placeholder={`Filter by ${filterOptions.find(f => f.value === selectedFilter).label}`}
                                options={getOptions(selectedFilter)}
                                value={filters[selectedFilter]}
                                onChange={vals => setFilters(prev => ({ ...prev, [selectedFilter]: vals || [] }))}
                                closeMenuOnSelect={false}
                                isMulti
                                isClearable
                                components={{ Option: CheckboxOption }}
                                styles={{
                                    container: provided => ({ ...provided, width: 250 }),
                                    multiValue: provided => ({ ...provided, backgroundColor: "#e0e0e0" }),
                                    option: provided => ({ ...provided, display: "flex", alignItems: "center" }),
                                }}
                            />

                            {/* Add Employee icon */}
                            <FaUserPlus
                                size={22}
                                color="#3498db"
                                title="Add Employee"
                                onClick={() => {
                                    setShowModal(true);
                                    setEditingEmp(null);
                                    setFormData({ emp_name: "", emp_mail_id: "", account_pass: "", emp_mobile_no: "", emp_department: "", emp_type: "", emp_location: "", emp_access_level: "" });
                                }}
                                style={{ cursor: "pointer" }}
                            />
                            {/* Export / Download icons */}
                            <FaDownload
                                size={20}
                                color="#333"
                                title="Download"
                            />
                            <FaFilePdf
                                size={24}
                                color="#e74c3c"
                                title="Export as PDF"
                                onClick={() => exportEmployeesToPDF(filteredEmployees)}
                            />
                            <FaFileExcel
                                size={24}
                                color="#27ae60"
                                title="Export as Excel"
                                onClick={() => exportEmployeesToExcel(filteredEmployees)}
                            />
                        </div>
                    </div>
                    <div className="table-top-wrapper">
                        {/* Table */}
                        <div className="employee-table-wrapper">
                            <table className="employee-table">
                                <thead>
                                    <tr>
                                        <th>ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Department</th>
                                        <th>Type</th><th>Location</th><th>Access</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="9" style={{ textAlign: "center" }}>Loading...</td></tr>
                                    ) : employees.map(emp => (
                                        <tr key={emp.emp_id}>
                                            <td>{emp.emp_id}</td>
                                            <td>{emp.emp_name}</td>
                                            <td>{emp.emp_mail_id}</td>
                                            <td>{emp.emp_mobile_no}</td>
                                            <td>{emp.emp_department}</td>
                                            <td>{emp.emp_type}</td>
                                            <td>{emp.emp_location}</td>
                                            <td>{emp.emp_access_level}</td>
                                            <td>
                                                <FaEdit style={{ cursor: "pointer", marginRight: "10px", color: "blue" }} onClick={() => openEditModal(emp)} />
                                                <FaTrash style={{ cursor: "pointer", color: "red" }} onClick={() => handleDelete(emp.emp_id)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
                        <button className="pagination_btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Previous</button>
                        <span style={{ marginTop: "8px" }}>Page {currentPage} of {totalPages}</span>
                        <button className="pagination_btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
                    </div>
                </div>

                {/* Employee Modal */}
                {showModal && (
                    <div
                        className="employee-modal-overlay"
                        onClick={() => setShowModal(false)}
                    >
                        <div
                            className="employee-modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close icon */}
                            <div className="close-icon" onClick={() => setShowModal(false)} title="Close">
                                <i className="fa-solid fa-xmark"></i>
                            </div>

                            <h3>{editingEmp ? "Edit Employee" : "Add Employee"}</h3>

                            <div className="modal-fields">
                                {/* Row 1 */}
                                <div className="field-group">
                                    <label>Name <span className="required">*</span></label>
                                    <input type="text" name="emp_name" value={formData.emp_name} onChange={handleInputChange} className={errors.emp_name ? "input-error" : ""} />
                                </div>

                                <div className="field-group">
                                    <label>Email <span className="required">*</span></label>
                                    <input type="email" name="emp_mail_id" value={formData.emp_mail_id} onChange={handleInputChange} className={errors.emp_mail_id ? "input-error" : ""} placeholder="example@dolluzcorp.com" />
                                </div>

                                <div className="field-group">
                                    <label>Mobile <span className="required">*</span></label>
                                    <input type="text" name="emp_mobile_no" maxLength={10} value={formData.emp_mobile_no} onChange={handleInputChange} className={errors.emp_mobile_no ? "input-error" : ""} placeholder="10-digit mobile" />
                                </div>

                                <div className="field-group">
                                    <label>Location <span className="required">*</span></label>
                                    <select name="emp_location" value={formData.emp_location} onChange={handleInputChange} className={errors.emp_location ? "input-error" : ""}>
                                        <option value="">Select Location</option>
                                        {locations.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label>Department <span className="required">*</span></label>
                                    <select name="emp_department" value={formData.emp_department} onChange={handleInputChange} className={errors.emp_department ? "input-error" : ""}>
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label>Employee Type <span className="required">*</span></label>
                                    <select name="emp_type" value={formData.emp_type} onChange={handleInputChange} className={errors.emp_type ? "input-error" : ""}>
                                        <option value="">Select Type</option>
                                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                {/* Row 3 */}
                                <div className="field-group">
                                    <label>Access Level <span className="required">*</span></label>
                                    <select name="emp_access_level" value={formData.emp_access_level} onChange={handleInputChange} className={errors.emp_access_level ? "input-error" : ""}>
                                        <option value="">Select Access Level</option>
                                        {accessLevels.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>

                                {/* Account Password - only for Admin */}
                                {formData.emp_access_level === "Admin" && (
                                    <div className="field-group password-field">
                                        <label>Account Password <span className="required">*</span></label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="account_pass"
                                                value={formData.account_pass}
                                                onChange={handleInputChange}
                                                className={errors.account_pass ? "input-error" : ""}
                                            />
                                            <span
                                                className="password-toggle-icon"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Action buttons */}
                            <div className="modal-actions">
                                <button className="save-btn" onClick={handleSave}>Save</button>
                                <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Employee_Center;
