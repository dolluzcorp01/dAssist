import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    FaTicketAlt,
    FaSignOutAlt,
    FaUsers,
    FaTachometerAlt,
    FaUser,
    FaAngleLeft,
    FaGripLines,
    FaBars,
    FaChevronLeft,
    FaAngleRight
} from "react-icons/fa";
import LOGO from "./assets/img/LOGO.png";
import "./left_navbar.css";

function LeftNavbar({ navSize, setNavSize }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleNavSizeChange = (size) => {
        setNavSize(size);
        setDropdownOpen(false);
    };

    return (
        <div className={`left-navbar ${navSize}`} style={{ '--navbar-width': navSize === 'full' ? '220px' : navSize === 'icon-only' ? '40px' : '10px' }}>
            <div className={`navbar-header ${navSize === "full" ? "full-view-header" : ""}`}>
                {navSize !== "hidden" && (<h3>
                    <a className="navbar-brand" href="#">
                        <img src={LOGO} alt="dassist Logo" className="logo-img" />
                    </a>
                    {navSize === "full" && "dAssist"}
                </h3>
                )}
            </div>

            {navSize !== "hidden" && (
                <ul className="navbar-menu">
                    <li>
                        <NavLink to="/Support_Tickets" className={({ isActive }) => isActive ? "active" : ""}>
                            <FaTicketAlt className="nav-icon" />
                            {navSize === "full" && "Support Tickets"}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/Employee_Center" className={({ isActive }) => isActive ? "active" : ""}>
                            <FaUsers className="nav-icon" />
                            {navSize === "full" && "Employee Center"}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/Dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                            <FaTachometerAlt className="nav-icon" />
                            {navSize === "full" && "Dashboard"}
                        </NavLink>
                    </li>
                    <li>
                        <a
                            href="/Tickets"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-link"
                        >
                            <FaUser className="nav-icon" />
                            {navSize === "full" && "User Interface"}
                        </a>
                    </li>
                </ul>
            )}

            <div className="logout-container">
                <div className="logout-container">
                    {/* Dropdown Arrow Above */}
                    <div
                        className="view-dropdown-arrow"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        {navSize === "full" ? <FaAngleLeft /> : <FaAngleRight />}
                    </div>

                    {/* Logout Button Below */}
                    {navSize !== "hidden" && (
                        <NavLink
                            to="/Login"
                            onClick={() => localStorage.clear()}
                            className="logout-link"
                        >
                            <FaSignOutAlt
                                className="nav-icon"
                                style={navSize === "icon-only" ? { marginLeft: "10px" } : { marginRight: "5px" }}
                            />
                            {navSize === "full" && "Logout"}
                        </NavLink>
                    )}
                </div>
            </div>

            {dropdownOpen && (
                <div className="view-dropdown-menu">
                    <div className="view-dropdown-item" onClick={() => handleNavSizeChange("full")}>
                        <FaGripLines /> Full
                    </div>
                    <div className="view-dropdown-item" onClick={() => handleNavSizeChange("icon-only")}>
                        <FaBars /> Icon Only
                    </div>
                    <div className="view-dropdown-item" onClick={() => handleNavSizeChange("hidden")}>
                        <FaChevronLeft /> Hidden
                    </div>
                </div>
            )}
        </div>
    );
}

export default LeftNavbar;
