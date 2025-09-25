import React, { useState, useRef } from "react";
import LOGO from "./assets/img/LOGO.png";
import doodle_bg from "./assets/img/doodle_bg.jpg";
import { apiFetch } from "./utils/api";
import Swal from "sweetalert2";
import { FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./Tickets.css";

const Tickets = () => {
    const [emailError, setEmailError] = useState("");
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Loading state

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

        // ✅ Build FormData for file + text fields
        const formDataToSend = new FormData();
        for (const key in formData) {
            if (formData[key]) {
                formDataToSend.append(key, formData[key]);
            }
        }

        try {
            const res = await fetch("http://localhost:5000/api/tickets/submit", {
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
                            <div className="field">
                                <label>Priority <span style={{ color: "red" }}>* </span> </label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    disabled={!formData.emp_id}
                                    className={errors.priority ? "invalid" : ""}
                                >
                                    <option value="">Select Priority</option>
                                    <option value="High"> High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                            <div className="field">
                                <label>Preferred Contact Method <span style={{ color: "red" }}>* </span> </label>
                                <select
                                    name="contactMethod"
                                    value={formData.contactMethod}
                                    onChange={handleChange}
                                    disabled={!formData.emp_id}
                                    className={errors.contactMethod ? "invalid" : ""}
                                >
                                    <option value="">Select Contact Method</option>
                                    <option value="Email">Email</option>
                                    <option value="Mobile">Mobile/Phone</option>
                                    <option value="Cliq">Cliq</option>
                                </select>
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
                        <label>Description <span style={{ color: "red" }}>* </span> </label>
                        <textarea
                            name="description"
                            rows="4"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={!formData.emp_id}
                            className={errors.description ? "invalid" : ""}
                        ></textarea>

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
