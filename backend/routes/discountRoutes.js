const express = require("express");
const router = express.Router();

const db = require("../db");
const poolPromise = db.poolPromise;
const sql = db.sql;

// ✅ FINAL TABLE NAME
const TABLE = "dbo.Discount";

/* ================= GET ================= */
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT TOP 100 * FROM ${TABLE}
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error("GET ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= INSERT ================= */
router.post("/", async (req, res) => {
  try {
    const pool = await poolPromise;
    const d = req.body;

    // ✅ VALIDATE: Check all required fields
    if (!d.DiscountCode || !d.DiscountCode.toString().trim()) {
      return res.status(400).json({ error: "Discount Code is required." });
    }

    if (!d.Description || !d.Description.toString().trim()) {
      return res.status(400).json({ error: "Description is required." });
    }

    console.log("📝 Inserting discount:", d.DiscountCode);

    await pool.request()
      .input("DiscountCode", sql.VarChar, d.DiscountCode.toString().trim())
      .input("Description", sql.VarChar, d.Description.toString().trim())
      .input("DiscountPercentage", sql.Numeric(18, 2), Number(d.DiscountPercentage) || 0)
      .input("FromDate", sql.SmallDateTime, d.FromDate ? new Date(d.FromDate) : null)
      .input("ToDate", sql.SmallDateTime, d.ToDate ? new Date(d.ToDate) : null)
      .input("isActive", sql.Bit, d.isActive ? 1 : 0)
      .input("isGuestMeal", sql.Bit, d.isGuestMeal ? 1 : 0)
      .input("Backcolor", sql.VarChar, d.Backcolor || "")
      .input("ForeColor", sql.VarChar, d.ForeColor || "")
      .query(`
  INSERT INTO ${TABLE} (
    Discountid,
    DiscountCode,
    Description,
    DiscountPercentage,
    FromDate,
    ToDate,
    DiscountQty,
    Discountprice,
    ActualPrice,
    isActive,
    CreatedBy,
    CreatedDate,
    isGuestMeal,
    Paymode,
    Backcolor,
    ForeColor,
    DiscountAmount
  )
  VALUES (
    NEWID(),
    @DiscountCode,
    @Description,
    @DiscountPercentage,
    @FromDate,
    @ToDate,
    0,
    0,
    0,
    @isActive,
    NEWID(),
    GETDATE(),
    @isGuestMeal,
    0,
    @Backcolor,
    @ForeColor,
    0
  )
`);

    console.log("✅ Discount inserted successfully:", d.DiscountCode);
    res.json({ success: true, message: "Discount inserted successfully" });

  } catch (err) {
    console.error("❌ INSERT ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ================= UPDATE ================= */
router.put("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const d = req.body;

    // ✅ VALIDATE: Check all required fields
    if (!d.DiscountCode || !d.DiscountCode.toString().trim()) {
      return res.status(400).json({ error: "Discount Code is required." });
    }

    if (!d.Description || !d.Description.toString().trim()) {
      return res.status(400).json({ error: "Description is required." });
    }

    console.log("✏️ Updating discount:", req.params.id);

    await pool.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .input("DiscountCode", sql.VarChar, d.DiscountCode.toString().trim())
      .input("Description", sql.VarChar, d.Description.toString().trim())
      .input("DiscountPercentage", sql.Numeric(18, 2), Number(d.DiscountPercentage) || 0)
      .input("FromDate", sql.SmallDateTime, d.FromDate ? new Date(d.FromDate) : null)
      .input("ToDate", sql.SmallDateTime, d.ToDate ? new Date(d.ToDate) : null)
      .input("isActive", sql.Bit, d.isActive ? 1 : 0)
      .input("isGuestMeal", sql.Bit, d.isGuestMeal ? 1 : 0)
      .input("Backcolor", sql.VarChar, d.Backcolor || "")
      .input("ForeColor", sql.VarChar, d.ForeColor || "")

      .query(`
        UPDATE ${TABLE} SET
          DiscountCode = @DiscountCode,
          Description = @Description,
          DiscountPercentage = @DiscountPercentage,
          FromDate = @FromDate,
          ToDate = @ToDate,
          isActive = @isActive,
          isGuestMeal = @isGuestMeal,
          Backcolor = @Backcolor,
          ForeColor = @ForeColor,
          ModyfiedDate = GETDATE()
        WHERE Discountid = @id
      `);

    console.log("✅ Discount updated successfully");
    res.json({ success: true, message: "Discount updated successfully" });

  } catch (err) {
    console.error("❌ UPDATE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ================= DELETE ================= */
router.delete("/:id", async (req, res) => {
  try {
    const pool = await poolPromise;

    if (!req.params.id) {
      return res.status(400).json({ error: "Discount ID is required for deletion." });
    }

    console.log("🗑️ Deleting discount:", req.params.id);

    await pool.request()
      .input("id", sql.UniqueIdentifier, req.params.id)
      .query(`DELETE FROM ${TABLE} WHERE Discountid = @id`);

    console.log("✅ Discount deleted successfully");
    res.json({ success: true, message: "Discount deleted successfully" });

  } catch (err) {
    console.error("❌ DELETE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;