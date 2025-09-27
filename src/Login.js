import React, { useState } from "react";
import { apiFetch, API_BASE } from "./utils/api";
import LOGO from "./assets/img/LOGO.png";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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

    return (
        <div className="login-page">
            <div className="login-container">
                <img src={LOGO} alt="dAssist Logo" />
                <h4>Sign In</h4>
                <p>Please login to access the dashboard</p>

                <div className="form-group">
                    <label>Username (Email)</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="form-control"
                        placeholder="e.g. jane.doe@acme.com"
                    />
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-control"
                        placeholder="Enter your password"
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Secure Sign-in"}
                </button>

                <a href="#" className="forgot-link">
                    Forgot password?
                </a>
            </div>
        </div>
    );
}

export default Login;
