const express = require("express");
const getDBConnection = require("../../config/db");
const router = express.Router();

const db = getDBConnection("dassist");

// 🔹 Login 
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    const query = `SELECT * FROM employee WHERE emp_mail_id = ? AND deleted_time IS NULL`;
    db.query(query, [username], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });

        const employee = results[0];

        // Direct comparison without encryption
        if (employee.account_pass !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Check if employee is admin
        if (employee.emp_access_level.toLowerCase() !== "admin") {
            return res.status(403).json({ message: "Access denied. Only admins can login." });
        }

        // ✅ Login successful for admin
        res.json({ message: "Login successful", employee });
    });
});

module.exports = router;
