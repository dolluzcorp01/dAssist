
const express = require("express");
const getDBConnection = require('../../config/db');
const router = express.Router();
const mysql = require("mysql2");
const multer = require("multer");
const nodemailer = require("nodemailer");

const db = getDBConnection('dassist');

// Lookup employee by email
router.get("/employee/:email", (req, res) => {
    const email = req.params.email;
    const query = `SELECT * FROM employee WHERE emp_mail_id = ? AND deleted_time IS NULL`;
    db.query(query, [email], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (results.length > 0) return res.json(results[0]);
        return res.status(404).json({ error: "Employee not found" });
    });
});

// 🔹 Configure Nodemailer (use Gmail or company SMTP)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "vv.pavithran12@gmail.com",
        pass: "aajuyoahcuszqrey",
    },
});

const ticketUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, "Tickets_file_uploads/"),
        filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// 🔹 Submit ticket details + send email
router.post("/submit", ticketUpload.single("attachment"), (req, res) => {
    const data = req.body;
    const attachmentPath = req.file ? req.file.path : null;

    const insertQuery = `
    INSERT INTO tickets_entry
      (ticket_id, emp_id, emp_alternate_mobile_no, category, priority_level, contact_method, subject, description, attachment_file, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const placeholderId = "TEMP";

    db.query(insertQuery, [
        placeholderId,
        data.emp_id,
        data.altMobile,
        data.category,
        data.priority,
        data.contactMethod,
        data.subject,
        data.description,
        attachmentPath,
        data.created_by,
    ], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error" });

        const autoId = result.insertId;
        const currentYear = new Date().getFullYear();
        const formattedId = `DZIND-${currentYear}-${String(autoId).padStart(5, "0")}`;

        const updateQuery = `UPDATE tickets_entry SET ticket_id = ? WHERE auto_id = ?`;
        db.query(updateQuery, [formattedId, autoId], async (err2) => {
            if (err2) return res.status(500).json({ error: "Failed to update ticket_id" });

            // 🔹 Build email content
            const mailOptions = {
                from: '"Dolluz Support" <vv.pavithran12@gmail.com>',
                to: `${data.email}, info@dolluzcorp.com`,
                subject: `[Ticket ID: ${formattedId}] Support Request Notification`,
                html: `
          <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #4A90E2;">Ticket Submission Confirmation</h2>
            <p>Hello <strong>${data.name}</strong>,</p>
            <p>Your ticket <strong>${formattedId}</strong> regarding “<em>${data.subject}</em>” has been <strong>Submitted</strong>.</p>
            <p><strong>Current Status:</strong> Submitted</p>
            <p><strong>Latest Comment:</strong> - </p>
            <br/>
            <p>For any concerns, amendments, or notes, please write to 
              <a href="mailto:info@dolluzcorp.com">info@dolluzcorp.com</a> 
              with the Ticket ID in the subject line.
            </p>
            <br/>
            <p style="color: #888;">— Dolluz Support Team</p>
          </div>
        `,
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (emailErr) {
                console.error("❌ Error sending ticket email:", emailErr);
            }

            return res.json({
                message: "Ticket submitted successfully",
                ticket_id: formattedId,
            });
        });
    });
});

// 🔹 Get all tickets with employee info including attachment
router.get("/all", (req, res) => {
    const query = `
    SELECT 
      t.ticket_id,
      e.emp_name,
      e.emp_mail_id,
      e.emp_department,
      t.category,
      t.priority_level,
      t.contact_method,
      t.subject,
      t.description, 
      t.attachment_file, 
      t.ticket_status,
      t.created_time
    FROM tickets_entry t
    JOIN employee e ON t.emp_id = e.emp_id
    ORDER BY t.created_time DESC
  `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Error fetching tickets:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

router.post("/save_status", (req, res) => {
    const { ticket_id, ticket_status, ticket_comments, updated_by, prev_status } = req.body;

    if (!ticket_id || !updated_by) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let statusChanged = ticket_status && ticket_status !== prev_status;
    let commentAdded = ticket_comments && ticket_comments.trim() !== "";

    if (!statusChanged && !commentAdded) {
        return res.status(400).json({ message: "No status or comments to save" });
    }

    // Insert Status Change
    const insertStatus = statusChanged ? new Promise((resolve, reject) => {
        db.query(
            `INSERT INTO ticket_status_history (ticket_id, ticket_status, updated_by) VALUES (?, ?, ?)`,
            [ticket_id, ticket_status, updated_by],
            (err) => err ? reject(err) : resolve()
        );
    }) : Promise.resolve();

    // Insert Comment
    const insertComment = commentAdded ? new Promise((resolve, reject) => {
        db.query(
            `INSERT INTO ticket_comment_history (ticket_id, ticket_comments, added_by) VALUES (?, ?, ?)`,
            [ticket_id, ticket_comments, updated_by],
            (err) => err ? reject(err) : resolve()
        );
    }) : Promise.resolve();

    Promise.all([insertStatus, insertComment])
        .then(() => {
            if (statusChanged) {
                db.query(
                    `UPDATE tickets_entry SET ticket_status = ? WHERE ticket_id = ?`,
                    [ticket_status, ticket_id],
                    () => res.json({ message: "Saved successfully" })
                );
            } else {
                res.json({ message: "Comment saved successfully" });
            }
        })
        .catch(err => res.status(500).json({ message: "Database error", error: err }));
});

// POST /api/tickets/send_status_mail
router.post("/send_status_mail", async (req, res) => {
    const { ticket_id } = req.body;
    if (!ticket_id) return res.status(400).json({ message: "Missing ticket_id" });

    // 1️⃣ Get ticket + employee info
    const ticketQuery = `
        SELECT t.ticket_id, t.subject, e.emp_name, e.emp_mail_id
        FROM tickets_entry t
        JOIN employee e ON t.emp_id = e.emp_id
        WHERE t.ticket_id = ?
    `;
    db.query(ticketQuery, [ticket_id], (err, ticketResults) => {
        if (err) return res.status(500).json({ message: "DB error fetching ticket", error: err });
        if (ticketResults.length === 0) return res.status(404).json({ message: "Ticket not found" });

        const ticket = ticketResults[0];

        // 2️⃣ Get latest status and comment
        const latestStatusQuery = `
            SELECT ticket_status, updated_by, updated_time
            FROM ticket_status_history
            WHERE ticket_id = ?
            ORDER BY updated_time DESC
            LIMIT 1
        `;

        const latestCommentQuery = `
            SELECT ticket_comments, added_by, added_time
            FROM ticket_comment_history
            WHERE ticket_id = ?
            ORDER BY added_time DESC
            LIMIT 1
        `;

        db.query(latestStatusQuery, [ticket_id], (err2, statusResults) => {
            if (err2) return res.status(500).json({ message: "DB error fetching status", error: err2 });
            const latestStatus = statusResults[0] || null;

            db.query(latestCommentQuery, [ticket_id], async (err3, commentResults) => {
                if (err3) return res.status(500).json({ message: "DB error fetching comments", error: err3 });
                const latestComment = commentResults[0] || null;

                // 3️⃣ Determine which update is latest
                let statusToSend = null;
                let commentToSend = null;

                if (latestStatus && latestComment) {
                    const statusTime = new Date(latestStatus.updated_time).getTime();
                    const commentTime = new Date(latestComment.added_time).getTime();

                    if (statusTime > commentTime) {
                        statusToSend = latestStatus.ticket_status;
                    } else if (commentTime > statusTime) {
                        commentToSend = latestComment.ticket_comments;
                    } else {
                        // both updated at same time
                        statusToSend = latestStatus.ticket_status;
                        commentToSend = latestComment.ticket_comments;
                    }
                } else if (latestStatus) {
                    statusToSend = latestStatus.ticket_status;
                } else if (latestComment) {
                    commentToSend = latestComment.ticket_comments;
                } else {
                    return res.status(400).json({ message: "No updates found to send" });
                }

                // 4️⃣ Prepare email content
                const mailOptions = {
                    from: '"Dolluz Support" <vv.pavithran12@gmail.com>',
                    to: ticket.emp_mail_id,
                    subject: `[Ticket ID: ${ticket.ticket_id}] - Update on Your Request`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                            <h2 style="color: #4A90E2;">Ticket Update Notification</h2>
                            <p>Hello <strong>${ticket.emp_name}</strong>,</p>
                            <p>Your ticket <strong>${ticket.ticket_id}</strong> regarding “<em>${ticket.subject}</em>” has an update.</p>
                            ${statusToSend ? `<p><strong>Current Status:</strong> ${statusToSend}</p>` : ''}
                            ${commentToSend ? `<p><strong>Latest Comment:</strong> ${commentToSend}</p>` : ''}
                            <br/>
                            <p>For any concerns, please contact 
                                <a href="mailto:info@dolluzcorp.com">info@dolluzcorp.com</a> with the Ticket ID in the subject line.
                            </p>
                            <br/>
                            <p style="color: #888;">— Dolluz Support Team</p>
                        </div>
                    `,
                };

                // 5️⃣ Send email
                try {
                    await transporter.sendMail(mailOptions);
                    res.json({ message: "Email sent successfully" });
                } catch (emailErr) {
                    console.error("❌ Error sending email:", emailErr);
                    res.status(500).json({ message: "Failed to send email", error: emailErr });
                }
            });
        });
    });
});

// Get history by ticket_id
router.get("/ticket_history/:ticketId", (req, res) => {
    const { ticketId } = req.params;
    const query = `
        SELECT 
            ticket_id,
            ticket_status,
            updated_by      AS status_updated_by,
            updated_time    AS status_updated_time,
            NULL            AS ticket_comments,
            NULL            AS comment_added_by,
            NULL            AS comments_added_time
        FROM ticket_status_history
        WHERE ticket_id = ?

        UNION ALL

        SELECT
            ticket_id,
            NULL            AS ticket_status,
            NULL            AS status_updated_by,
            NULL            AS status_updated_time,
            ticket_comments,
            added_by        AS comment_added_by,
            added_time      AS comments_added_time
        FROM ticket_comment_history
        WHERE ticket_id = ?

        ORDER BY 
            COALESCE(status_updated_time, comments_added_time) ASC
    `;
    db.query(query, [ticketId, ticketId], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error", details: err });
        res.json(results);
    });
});

module.exports = router;
