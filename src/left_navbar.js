import React from "react";
import { NavLink } from "react-router-dom";
import { FaTicketAlt, FaSignOutAlt, FaUsers, FaTachometerAlt, FaUser } from "react-icons/fa";
import LOGO from "./assets/img/LOGO.png";
import "./left_navbar.css";

function LeftNavbar() {
    return (
        <div className="left-navbar">
            <div className="navbar-header">
                <h3>
                    <a className="navbar-brand" href="#">
                        <img
                            src={LOGO}
                            alt="dassist Logo"
                            style={{
                                height: "50px",
                                objectFit: "contain",
                                marginLeft: "-50px",
                                marginRight: "-10px",
                            }}
                        />
                    </a>
                    dAssist
                </h3>
            </div>

            {/* Main Menu */}
            <ul className="navbar-menu">
                <li>
                    <NavLink to="/Support_Tickets" activeclassname="active">
                        <FaTicketAlt className="nav-icon" /> Support Tickets
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/Employee_Center" activeclassname="active">
                        <FaUsers className="nav-icon" /> Employee Center
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/Dashboard" activeclassname="active">
                        <FaTachometerAlt className="nav-icon" /> Dashboard
                    </NavLink>
                </li>

                {/* Combined Icon + Opens in NEW TAB */}
                <li>
                    <a
                        href="/Tickets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nav-link"
                    >
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <FaUser className="nav-icon" />
                        </span>
                        User Interface
                    </a>
                </li>
            </ul>

            {/* Logout at Bottom */}
            <div style={{ marginTop: "auto" }}>
                <NavLink
                    to="/Login"
                    activeclassname="active"
                    onClick={() => localStorage.clear()}
                    className="logout-link"
                >
                    <FaSignOutAlt className="nav-icon" /> Logout
                </NavLink>
            </div>
        </div>
    );
}

export default LeftNavbar;
