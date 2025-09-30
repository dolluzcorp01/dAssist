const mysql = require('mysql2');

// Store active pools in an object
const pools = {};

// Function to get or create a pool for a given database
function getDBConnection(database) {
    if (!pools[database]) {
        pools[database] = mysql.createPool({
            connectionLimit: 100,  // Increase if needed
            host: '127.0.0.1',
            user: 'root',
            password: 'pavithran@123',
            database: database,  // ✅ Use the actual database name
            waitForConnections: true,
            queueLimit: 1000, // Limit waiting queries
            multipleStatements: true,
        });
    }
    return pools[database];
}

module.exports = getDBConnection;
