import React, { useState, useRef, useEffect } from "react";
import LOGO from "./assets/img/LOGO.png";
import doodle_bg from "./assets/img/doodle_bg.jpg";
import { apiFetch } from "./utils/api";
import Swal from "sweetalert2";
import { FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";
import "./Tickets.css";

const Tickets = () => {
    const [emailError, setEmailError] = useState("");
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Loading state
    const [showPriority, setShowPriority] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const priorityRef = useRef(null);
    const contactRef = useRef(null);

    const { quill, quillRef } = useQuill({
        theme: "snow",
        modules: {
            toolbar: [
                ["bold", "italic", "underline", "strike"],
                [{ list: "ordered" }, { list: "bullet" }],
                [{ align: [] }],
                ["clean"],
            ],
        },
        formats: [
            "bold", "italic", "underline", "strike",
            "list", "bullet", "align",
        ],
    });

    // listen for changes
    useEffect(() => {
        if (quill) {
            quill.on("text-change", () => {
                handleDescriptionChange(quill.root.innerHTML);
            });
        }
    }, [quill]);

    const priorities = [
        {
            value: "High",
            label: "High",
            icon: (
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <i className="fa-solid fa-angle-up" style={{ color: "red", fontSize: "16px", lineHeight: "0.6" }}></i>
                    <i className="fa-solid fa-angle-up" style={{ color: "red", fontSize: "12px", lineHeight: "0.6" }}></i>
                    <i className="fa-solid fa-angle-up" style={{ color: "red", fontSize: "10px", lineHeight: "0.6" }}></i>
                </span>
            ),
        },
        {
            value: "Medium",
            label: "Medium",
            icon: (
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <i className="fa-solid fa-angle-up" style={{ color: "orange", fontSize: "14px", lineHeight: "0.6" }}></i>
                    <i className="fa-solid fa-angle-up" style={{ color: "orange", fontSize: "10px", lineHeight: "0.6" }}></i>
                </span>
            ),
        },
        {
            value: "Low",
            label: "Low",
            icon: (
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <i className="fa-solid fa-angle-up" style={{ color: "yellow", fontSize: "12px", lineHeight: "0.6" }}></i>
                </span>
            ),
        },
    ];

    const contactMethods = [
        {
            value: "Email",
            label: "Email",
            icon: <i className="fa-solid fa-envelope contact-icons email-icon"></i>,
        },
        {
            value: "Mobile",
            label: "Mobile/Phone",
            icon: <i className="fa-solid fa-mobile-screen contact-icons mobile-icon"></i>,
        },
        {
            value: "Cliq",
            label: "Cliq",
            icon: <i className="fa-brands fa-rocketchat contact-icons cliq-icon"></i>,
        },
    ];

    useEffect(() => {
        const handleOutsideClick = (e) => {
            // Close Priority dropdown if clicked outside
            if (priorityRef.current && !priorityRef.current.contains(e.target)) {
                setShowPriority(false);
            }

            // Close Contact dropdown if clicked outside
            if (contactRef.current && !contactRef.current.contains(e.target)) {
                setShowContact(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        altMobile: "",
        department: "",
        employeeType: "",
        location: "",
        category: "",
        priority: "",
        contactMethod: "",
        subject: "",
        description: "",
        attachment: null,
    });

    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Max size 0.5 MB
        if (file.size > 0.5 * 1024 * 1024) {
            Swal.fire({
                icon: "error",
                title: "File Too Large",
                text: "File size must be less than 0.5 MB",
            });
            e.target.value = null; // clear input
            return;
        }

        setFormData((prev) => ({ ...prev, attachment: file }));
    };

    const removeFile = () => {
        setFormData((prev) => ({ ...prev, attachment: null }));
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    // ✅ Handle field changes
    const handleChange = async (e) => {
        const { name, value, type, files } = e.target;

        if (name === "altMobile") {
            // Remove any non-digit characters
            const numericValue = value.replace(/\D/g, "");
            setFormData((prev) => ({ ...prev, [name]: numericValue }));
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === "file" ? files[0] : value,
        }));

        // ✅ If email field, check employee
        if (name === "email") {
            if (!value) {
                setEmailError("");
                setFormData((prev) => ({
                    ...prev,
                    name: "",
                    mobile: "",
                    department: "",
                    employeeType: "",
                    location: "",
                    emp_id: null,
                }));
                return;
            }

            try {
                const res = await apiFetch(`/api/tickets/employee/${value}`);
                if (!res.ok) throw new Error("Employee not found");

                const data = await res.json();

                setFormData((prev) => ({
                    ...prev,
                    emp_id: data.emp_id,
                    name: data.emp_name,
                    mobile: data.emp_mobile_no,
                    department: data.emp_department,
                    employeeType: data.emp_type,
                    location: data.emp_location,
                }));

                setEmailError("");
            } catch (err) {
                setEmailError("This email is not registered with Dolluz Corp. Please contact admin (info@dolluzcorp.com).");
                setFormData((prev) => ({
                    ...prev,
                    name: "",
                    mobile: "",
                    department: "",
                    employeeType: "",
                    location: "",
                    emp_id: null,
                }));
            }
        }
    };

    const handleDescriptionChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            description: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const fieldNames = {
            email: "Email",
            name: "Name",
            mobile: "Mobile No",
            altMobile: "Alternate Mobile No",
            department: "Department",
            employeeType: "Employee Type",
            location: "Location",
            category: "Category",
            priority: "Priority",
            contactMethod: "Preferred Contact Method",
            subject: "Subject",
            description: "Description",
        };

        // ✅ Validate fields in order
        const fieldOrder = [
            "email",
            "name",
            "mobile",
            "altMobile",
            "department",
            "employeeType",
            "location",
            "category",
            "priority",
            "contactMethod",
            "subject",
            "description",
        ];

        const newErrors = {};
        for (let field of fieldOrder) {
            // Special validation for altMobile
            if (field === "altMobile") {
                if (!formData.altMobile) {
                    newErrors[field] = true;
                    Swal.fire({
                        icon: "error",
                        title: "Validation Error",
                        text: "Alternate Mobile No is required",
                    });
                    break;
                }
                if (formData.altMobile.length !== 10) {
                    newErrors[field] = true;
                    Swal.fire({
                        icon: "error",
                        title: "Validation Error",
                        text: "Alternate Mobile No must be exactly 10 digits",
                    });
                    break;
                }
                continue;
            }

            // Special validation for subject length
            if (field === "subject" && formData.subject.length > 250) {
                newErrors[field] = true;
                Swal.fire({
                    icon: "error",
                    title: "Validation Error",
                    text: "Subject cannot exceed 250 characters",
                });
                break;
            }

            // General required field check
            if (!formData[field]) {
                newErrors[field] = true;
                Swal.fire({
                    icon: "error",
                    title: "Validation Error",
                    text: `${fieldNames[field]} is required`,
                });
                break;
            }
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            setIsSubmitting(false);
            return;
        }

        // 🔹 ✅ Description length validation (min 300, max 5000)
        const plainTextDescription = quill ? quill.getText().trim() : "";
        if (
            // plainTextDescription.length < 300 ||
            plainTextDescription.length > 5000) {
            Swal.fire({
                icon: "error",
                title: "Validation Error",
                text: "Description must be between 300 and 5000 characters",
            });
            setErrors(prev => ({ ...prev, description: true }));
            setIsSubmitting(false);
            return;
        }

        // ✅ Build FormData for file + text fields
        const formDataToSend = new FormData();
        for (const key in formData) {
            if (formData[key]) {
                formDataToSend.append(key, formData[key]);
            }
        }

        // ✅ Append created_by as emp_id of logged-in employee
        if (formData.emp_id) {
            formDataToSend.append("created_by", formData.emp_id);
        } else {
            Swal.fire({
                icon: "warning",
                title: "Validation Error",
                text: "Please select a valid employee email before submitting the ticket."
            });
            setIsSubmitting(false);
            return;
        }
        console.log("Submitting form data:", ...formDataToSend); // Debug log

        try {
            const res = await apiFetch("/api/tickets/submit", {
                method: "POST",
                body: formDataToSend,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error submitting ticket");

            // ✅ Redirect to Thank_You.js with data
            navigate("/thank-you", {
                state: { employeeName: formData.name, ticketId: data.ticket_id },
            });

            // ✅ Reset form
            setFormData({
                name: "",
                email: "",
                mobile: "",
                altMobile: "",
                department: "",
                employeeType: "",
                location: "",
                category: "",
                priority: "",
                contactMethod: "",
                subject: "",
                description: "",
                attachment: null,
                emp_id: null,
            });
            setErrors({});
            if (fileInputRef.current) {
                fileInputRef.current.value = null;
            }
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Submission Error",
                text: err.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="tickets-container">
            <div className="ticket-card">
                <div className="ticket-logo">
                    <a className="navbar-brand" href="#">
                        <img
                            src={LOGO}
                            alt="dassist Logo"
                            style={{
                                height: "80px",
                                objectFit: "contain",
                                marginLeft: "-60px",
                            }}
                        />
                    </a>
                    <span style={{ marginLeft: "-20px" }}>DOLLUZ</span>
                </div>

                <form className="ticket-form" onSubmit={handleSubmit}>
                    {/* Email */}
                    <label>Email {errors.email && <span style={{ color: "red" }}>* </span>} </label>
                    <div className="email-input-container">
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={emailError || errors.email ? "invalid" : formData.email && !emailError ? "valid" : ""}
                        />
                        {!emailError && formData.email && (
                            <i class="fa-solid fa-circle-check email-valid-icon"></i>
                        )}
                    </div>
                    {emailError && <p style={{ color: "red" }}>{emailError}</p>}

                    <div className={`ticket-fields ${!formData.emp_id ? "blurred" : ""}`}>

                        {/* Name */}
                        <label>Name {errors.name && <span style={{ color: "red" }}>* </span>} </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled
                            className={errors.name ? "invalid" : ""}
                        />

                        {/* Mobile & Alternate Mobile */}
                        <div className="ticket-row">
                            <div className="field">
                                <label>Mobile No {errors.mobile && <span style={{ color: "red" }}>* </span>} </label>
                                <input
                                    type="text"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    disabled
                                    className={errors.mobile ? "invalid" : ""}
                                />
                            </div>
                            <div className="field">
                                <label>Alternate Mobile No <span style={{ color: "red" }}>* </span> </label>
                                <input
                                    type="text"
                                    name="altMobile"
                                    value={formData.altMobile}
                                    onChange={handleChange}
                                    maxLength={10}
                                    disabled={!formData.emp_id}
                                    className={errors.altMobile ? "invalid" : ""}
                                />
                            </div>
                        </div>

                        {/* Department & Employee Type */}
                        <div className="ticket-row">
                            <div className="field">
                                <label>Department {errors.department && <span style={{ color: "red" }}>* </span>} </label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    disabled
                                    className={errors.department ? "invalid" : ""}
                                />
                            </div>
                            <div className="field">
                                <label>Employee Type {errors.employeeType && <span style={{ color: "red" }}>* </span>} </label>
                                <input
                                    type="text"
                                    name="employeeType"
                                    value={formData.employeeType}
                                    onChange={handleChange}
                                    disabled
                                    className={errors.employeeType ? "invalid" : ""}
                                />
                            </div>
                        </div>

                        {/* Location & Category */}
                        <div className="ticket-row">
                            <div className="field">
                                <label>Location <span style={{ color: "red" }}>* </span> </label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    disabled
                                    className={errors.location ? "invalid" : ""}
                                />
                            </div>
                            <div className="field">
                                <label>Category <span style={{ color: "red" }}>* </span> </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    disabled={!formData.emp_id}
                                    className={errors.category ? "invalid" : ""}
                                >
                                    <option value="">Select Category</option>
                                    <option value="IT">IT</option>
                                    <option value="HR">HR</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Finance">Finance</option>
                                </select>
                            </div>
                        </div>

                        {/* Priority & Preferred Contact Method */}
                        <div className="ticket-row">

                            {/* Priority Custom Dropdown */}
                            <div className="field">
                                <label>Priority <span style={{ color: "red" }}>* </span></label>

                                <div className="priority-custom-dropdown" ref={priorityRef}>
                                    <div className="selected-option" onClick={() => setShowPriority(prev => !prev)}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            {formData.priority
                                                ? priorities.find(p => p.value === formData.priority).icon
                                                : null}
                                            {formData.priority
                                                ? priorities.find(p => p.value === formData.priority).label
                                                : "Select Priority"}
                                        </div>
                                        <i className="fa-solid fa-angle-down priority-arrow"></i>
                                    </div>

                                    {/* Dropdown list */}
                                    {showPriority && (
                                        <div className="priority-dropdown-menu">
                                            {priorities.map((p) => (
                                                <div
                                                    key={p.value}
                                                    className="priority-dropdown-item"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent toggle
                                                        handleChange({ target: { name: "priority", value: p.value } });
                                                        setShowPriority(false);
                                                    }}
                                                >
                                                    {p.icon} {p.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="field">
                                <label>Preferred Contact Method <span style={{ color: "red" }}>* </span></label>

                                <div className="priority-custom-dropdown" ref={contactRef}>
                                    <div
                                        className="selected-option"
                                        onClick={() => setShowContact(prev => !prev)}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            {formData.contactMethod
                                                ? contactMethods.find(c => c.value === formData.contactMethod).icon
                                                : null}
                                            {formData.contactMethod
                                                ? contactMethods.find(c => c.value === formData.contactMethod).label
                                                : "Select Contact Method"}
                                        </div>
                                        <i className="fa-solid fa-angle-down priority-arrow"></i>
                                    </div>

                                    {showContact && (
                                        <div className="priority-dropdown-menu">
                                            {contactMethods.map(c => (
                                                <div
                                                    key={c.value}
                                                    className="priority-dropdown-item"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleChange({ target: { name: "contactMethod", value: c.value } });
                                                        setShowContact(false);
                                                    }}
                                                >
                                                    {c.icon} {c.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Subject */}
                        <label>Subject <span style={{ color: "red" }}>* </span> </label>
                        <input
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            disabled={!formData.emp_id}
                            maxLength={250} // limit typing to 250
                            className={errors.subject ? "invalid" : ""}
                        />

                        {/* Description */}
                        <label>
                            Description <span style={{ color: "red" }}>*</span>
                        </label>

                        <div
                            ref={quillRef}
                            style={{ height: "150px", marginBottom: "20px" }}
                        />

                        {/* Attachment */}
                        <div className="attachment-field" style={{ position: "relative", display: "inline-block", width: "100%" }}>
                            <label>Attachment</label>
                            <input
                                type="file"
                                name="attachment"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                disabled={!formData.emp_id}
                                style={{ width: "100%" }}
                            />

                            {/* Show X icon only if a file is selected */}
                            {formData.attachment && (
                                <FaTimes
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "50px",
                                        cursor: "pointer",
                                        color: "gray",
                                        zIndex: 10,
                                    }}
                                    onClick={removeFile}
                                    title="Remove file"
                                />
                            )}
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={isSubmitting} className="submit-btn">
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </button>

                        <p className="ticket-note">
                            <span style={{ fontWeight: "700", marginLeft: "-2px" }}>Note:</span> Once submitted, your request will be routed to the respective support team.
                            We are committed to adessing your concern as soon as possible.
                            Kindly bear with us and we appreciate your patience.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Tickets;
