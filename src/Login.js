import React, { useState, useEffect } from "react";
import { apiFetch, API_BASE } from "./utils/api";
import LOGO from "./assets/img/LOGO.png";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [oldPass, setOldPass] = useState("");
    const [email, setEmail] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [otpResetSource, setOtpResetSource] = useState(null);
    const [otp, setOtp] = useState("");
    const [timer, setTimer] = useState(0);
    const [otpSent, setOtpSent] = useState(false);
    const [mode, setMode] = useState("login"); // "login", "changePassword", "otpReset"
    const navigate = useNavigate();
    const [otpLoading, setOtpLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has("changePassword")) {
            setMode("changePassword");
        }
    }, []);

    const showToast = (message) => {
        Swal.fire({
            toast: true,
            position: 'top',
            icon: 'success',
            title: message,
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
        });
    };

    const handleLogin = async () => {
        if (!username || !password) {
            return Swal.fire({
                icon: "error",
                title: "Validation Error",
                text: "Username and password are required",
            });
        }

        setLoading(true);
        try {
            const res = await apiFetch("/api/login/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || "Login failed");

            // ✅ Store emp_id and emp_access_level in localStorage
            localStorage.setItem("emp_id", data.employee.emp_id);
            localStorage.setItem("emp_access_level", data.employee.emp_access_level);

            showToast("Login Successful! Redirecting...");

            setTimeout(() => {
                navigate("/Support_Tickets");
            }, 1800);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Login Failed",
                text: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOldPassword = async () => {
        if (!oldPass) {
            return Swal.fire({
                icon: "info",
                title: "Please enter your old password",
            });
        }

        try {
            const res = await apiFetch("/api/login/verify-old-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emp_id: localStorage.getItem("emp_id"), oldPass }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message);

            Swal.fire({ icon: "success", title: "Password Verified!" });
            setMode("setNewPassword");

        } catch (err) {
            Swal.fire({ icon: "error", title: err.message });
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPass || !confirmPass) {
            return Swal.fire({ icon: "error", title: "Please fill all fields" });
        }

        if (newPass !== confirmPass) {
            return Swal.fire({ icon: "error", title: "Passwords do not match" });
        }

        try {
            // ✅ Get emp_id if available, otherwise use email
            const emp_id = localStorage.getItem("emp_id") || null;

            const bodyData = emp_id
                ? { emp_id, newPass }
                : { email, newPass }; // fallback to email if emp_id is missing

            const res = await apiFetch("/api/login/update-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message);

            Swal.fire({ icon: "success", title: "Password updated!" });

            // ✅ Clear localStorage/email if needed and go back to login
            if (!emp_id) setEmail("");
            setMode("login");

        } catch (err) {
            Swal.fire({ icon: "error", title: err.message });
        }
    };

    const handleVerifyOtp = async () => {
        try {
            const res = await apiFetch("/api/login/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            Swal.fire({ icon: "success", title: "OTP Verified" });

            // ✅ Stop Timer & Prevent UI Reverting
            setTimer(0);
            setOtpSent(false);
            setOtpResetSource(null);

            // ✅ Now Safely Switch Mode
            setMode("setNewPassword");

        } catch (err) {
            Swal.fire({ icon: "error", title: err.message });
        }
    };

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
            return () => clearInterval(interval);
        } else {
            // ✅ Stop showing OTP section when timer expires
            setOtpSent(false);
        }
    }, [timer]);

    const handleSendOtp = async () => {
        if (!email) return Swal.fire({ icon: "error", title: "Enter your email" });

        setOtpLoading(true); // start loader
        try {
            const res = await apiFetch("/api/login/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            Swal.fire({ icon: "success", title: "OTP Sent!" });
            setOtpSent(true);
            setTimer(120); // 2 minutes

        } catch (err) {
            Swal.fire({ icon: "error", title: err.message });
            setOtpSent(false);
            setTimer(0);
        } finally {
            setOtpLoading(false); // stop loader
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <img src={LOGO} alt="dAssist Logo" />

                {mode === "login" && (
                    <>
                        <h4>Sign In</h4>
                        <p>Please login to access the dashboard</p>

                        {/* Username + Password */}
                        <div className="form-group">
                            <label>Username (Email)</label>
                            <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>

                        <button className="btn btn-primary" onClick={handleLogin}>Secure Sign-in</button>

                        {/* Forgot password from login page */}
                        <a onClick={() => {
                            setOtpResetSource("login");
                            setMode("otpReset");
                            setEmail("");
                            setOtp("");
                        }}
                            className="forgot-link" style={{ cursor: "pointer" }}>
                            Forgot password?
                        </a>
                    </>
                )}

                {mode === "changePassword" && (
                    <>
                        <h4>Change Password</h4>
                        <p>Enter your old password</p>

                        <div className="form-group">
                            <label>Old Password</label>
                            <input
                                type="password"
                                className="form-control"
                                value={oldPass}
                                onChange={(e) => setOldPass(e.target.value)}
                            />
                        </div>

                        <button className="btn btn-primary" onClick={handleVerifyOldPassword}>
                            Continue
                        </button>

                        {/* Change password via OTP instead (inside change password screen) */}
                        <a className="forgot-link" style={{ cursor: "pointer" }} onClick={() => { setOtpResetSource("changePassword"); setMode("otpReset"); }}>
                            Change password via OTP instead
                        </a>

                        <a className="forgot-link" style={{ cursor: "pointer" }} onClick={() => { setMode("login"); navigate("/login"); }}>
                            Back to Login
                        </a>
                    </>
                )}

                {mode === "otpReset" && (
                    <>
                        <h4 style={{ marginTop: "-10px" }}>Reset via OTP</h4>

                        {!otpSent ? (
                            <>
                                <p>Enter your registered email</p>

                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="text" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>

                                <button className="btn btn-primary" onClick={handleSendOtp} disabled={otpLoading}>
                                    {otpLoading ? <span className="spinner-border spinner-border-sm"></span> : "Send OTP"}
                                    {otpLoading ? " Sending OTP..." : ""}
                                </button>

                            </>
                        ) : (
                            <>
                                <p>OTP Sent to <strong>{email}</strong></p>

                                <div className="form-group">
                                    <label>Enter OTP</label>
                                    <input type="text" className="form-control" value={otp} onChange={(e) => setOtp(e.target.value)} />
                                </div>

                                <button className="btn btn-success" onClick={handleVerifyOtp} style={{ marginTop: "20px" }}>Verify OTP</button>
                                <p style={{ marginTop: "10px" }}>OTP Expires In: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</p>
                            </>
                        )}

                        {otpResetSource === "login" ? (
                            <a className="forgot-link" style={{ cursor: "pointer" }} onClick={() => { setMode("login"); navigate("/login"); }}>
                                Back to Login
                            </a>
                        ) : (
                            <a className="forgot-link" style={{ cursor: "pointer" }} onClick={() => setMode("changePassword")}>
                                Back to Change Password
                            </a>
                        )}
                    </>
                )}

                {mode === "setNewPassword" && (
                    <>
                        <h4>Set New Password</h4>

                        <div className="form-group">
                            <label>New Password</label>
                            <input type="password" className="form-control" onChange={(e) => setNewPass(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input type="password" className="form-control" onChange={(e) => setConfirmPass(e.target.value)} />
                        </div>

                        <button className="btn btn-primary" onClick={handleUpdatePassword}>
                            Update Password
                        </button>

                        <a className="forgot-link" style={{ cursor: "pointer" }} onClick={() => setMode("login")}>
                            Back to Login
                        </a>
                    </>
                )}

            </div>
        </div>
    );
}

export default Login;
