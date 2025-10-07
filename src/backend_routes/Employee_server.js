
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();
const mysql = require("mysql2");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const db = getDBConnection('dadmin');

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
    SELECT * 
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

  // First insert without emp_id
  const insertQuery = `
    INSERT INTO employee (
      emp_id, emp_first_name, emp_last_name, dob, blood_group, 
      emp_mail_id, account_pass, emp_mobile_no, emp_alternate_mobile_no, 
      emp_department, emp_type, carrier_level, job_position,
      emp_location, emp_access_level, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const placeholderEmpId = "TEMP";

  db.query(
    insertQuery,
    [
      placeholderEmpId,
      emp.emp_first_name, emp.emp_last_name, emp.dob, emp.blood_group,
      emp.emp_mail_id, emp.account_pass, emp.emp_mobile_no, emp.emp_alternate_mobile_no,
      emp.emp_department, emp.emp_type, emp.carrier_level, emp.job_position,
      emp.emp_location, emp.emp_access_level, emp.created_by
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      const autoId = result.insertId;
      const currentYear = new Date().getFullYear();
      const formattedEmpId = `dAssist-${currentYear}-${String(autoId).padStart(5, "0")}`;

      const updateQuery = `UPDATE employee SET emp_id = ? WHERE auto_id = ?`;

      db.query(updateQuery, [formattedEmpId, autoId], (err2) => {
        if (err2) return res.status(500).json({ error: "Failed to update emp_id" });

        res.json({ success: true, emp_id: formattedEmpId });
      });
    }
  );
});

// Update employee
router.put("/update/:id", (req, res) => {
  const emp = req.body;
  const query = `
    UPDATE employee 
    SET 
      emp_first_name=?, emp_last_name=?, dob=?, blood_group=?,
      emp_mail_id=?, account_pass=?, emp_mobile_no=?, emp_alternate_mobile_no=?,
      emp_department=?, emp_type=?, carrier_level=?, job_position=?,
      emp_location=?, emp_access_level=?, updated_by=?
    WHERE emp_id=?
  `;

  db.query(
    query,
    [
      emp.emp_first_name, emp.emp_last_name, emp.dob, emp.blood_group,
      emp.emp_mail_id, emp.account_pass, emp.emp_mobile_no, emp.emp_alternate_mobile_no,
      emp.emp_department, emp.emp_type, emp.carrier_level, emp.job_position,
      emp.emp_location, emp.emp_access_level, emp.updated_by,
      req.params.id
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
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

// Update employee active status
router.put("/toggle-active/:id", (req, res) => {
  const { is_active, updated_by } = req.body;
  const query = `UPDATE employee SET is_active=?, is_active_updated_by=?, is_active_updated_time=NOW() WHERE emp_id=?`;
  db.query(query, [is_active, updated_by, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
