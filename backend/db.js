const sql = require("mssql");

// MSSQL configuration
const dbConfig = {
  user: "ups",
  password: "ups",
  server: "26.14.83.241", // your SQL server IP
  port: 5899,
  database: "UCS", // your database name
  options: {
    encrypt: false,        // set true if using Azurec
    enableArithAbort: true // required for some SQL versions
  },
};

// Create a single connection pool
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log("✅ Connected to MSSQL");
    return pool;
  })
  .catch(err => {
    console.error("❌ DB Connection Error: ", err);
    process.exit(1); // stop server if DB fails
  });

module.exports = { sql, poolPromise };