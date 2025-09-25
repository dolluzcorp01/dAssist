const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const port = 5000;

// CORS setup
app.use(cors({
    origin: ["http://localhost:3000"],
    credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Routes
const TictesRoutes = require('./src/backend_routes/Tickets_server');
const LoginRoutes = require('./src/backend_routes/Login_server');

app.use("/api/tickets", TictesRoutes);
app.use("/api/Login_server", LoginRoutes);

// Serve uploaded files if needed
app.use('/Tickets_file_uploads', express.static(path.join(__dirname, 'Tickets_file_uploads')));

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
