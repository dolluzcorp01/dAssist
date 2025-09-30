
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();
const mysql = require("mysql2");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const db = getDBConnection('dassist');

const profileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "User_profile_file_uploads/"),
    filename: (req, file, cb) => {
      const empId = req.params.empId;
      const ext = path.extname(file.originalname);
      cb(null, `${empId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/upload-profile/:empId", profileUpload.single("profile"), (req, res) => {
  const empId = req.params.empId;
  const uploadDir = "User_profile_file_uploads/";
  const newFilePath = req.file ? req.file.path : null;

  if (!newFilePath) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // ✅ Delete old files of the same user
  fs.readdir(uploadDir, (err, files) => {
    if (err) return console.error("Error reading upload folder:", err);

    files.forEach((file) => {
      if (file.startsWith(empId + "-")) {
        const oldFilePath = path.join(uploadDir, file);
        if (oldFilePath !== newFilePath) {
          fs.unlink(oldFilePath, (err) => {
            if (err) console.error("Error deleting old file:", err);
          });
        }
      }
    });
  });

  // ✅ Update DB path
  const updateQuery = `
    UPDATE employee
    SET emp_profile_img = ?
    WHERE emp_id = ?
  `;

  db.query(updateQuery, [newFilePath, empId], (err) => {
    if (err) return res.status(500).json({ error: "Database error" });

    res.json({
      message: "Profile image updated successfully",
      profilePath: newFilePath,
    });
  });
});

// 🔹 Get all employees
router.get("/all", (req, res) => {
  const query = `
    SELECT 
      emp_id,
      emp_name,
      emp_mail_id,
      account_pass, 
      emp_mobile_no,
      emp_department,
      emp_type,
      emp_location,
      emp_access_level,
      created_by,
      created_time,
      updated_by,
      updated_time, 
      emp_profile_img
    FROM employee
    WHERE deleted_by IS NULL 
    ORDER BY created_time DESC 
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching employees:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// Create employee
router.post("/create", (req, res) => {
  const emp = req.body;
  const query = `INSERT INTO employee (emp_name, emp_mail_id, account_pass, emp_mobile_no, emp_department, emp_type, emp_location, emp_access_level, created_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(query, [emp.emp_name, emp.emp_mail_id, emp.account_pass, emp.emp_mobile_no, emp.emp_department, emp.emp_type, emp.emp_location, emp.emp_access_level, emp.created_by], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: result.insertId });
  });
});

// Update employee
router.put("/update/:id", (req, res) => {
  const emp = req.body;
  const query = `UPDATE employee 
                   SET emp_name=?, emp_mail_id=?, account_pass=?, emp_mobile_no=?, emp_department=?, emp_type=?, emp_location=?, emp_access_level=?, updated_by=? 
                   WHERE emp_id=?`;
  db.query(query, [emp.emp_name, emp.emp_mail_id, emp.account_pass, emp.emp_mobile_no, emp.emp_department, emp.emp_type, emp.emp_location, emp.emp_access_level, emp.updated_by, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Soft delete
router.put("/delete/:id", (req, res) => {
  const { deleted_by } = req.body;
  const query = `UPDATE employee SET deleted_by=?, deleted_time=NOW() WHERE emp_id=?`;
  db.query(query, [deleted_by, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
