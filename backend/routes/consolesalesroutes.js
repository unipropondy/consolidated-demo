const express = require("express");
const router = express.Router();
const { sql, poolPromise } = require("../db");

// GET Console Sales Report Data
router.get("/", async (req, res) => {
    try {
        const { type, fromDate, toDate } = req.query;
        const pool = await poolPromise;
        
        // Default to today if dates are missing
        const start = fromDate || new Date().toISOString().split('T')[0];
        const end = toDate || new Date().toISOString().split('T')[0];

        console.log(`📊 Report Request - Type: ${type}, From: ${start}, To: ${end}`);

        if (type === "detail") {
            // DETAILED REPORT QUERY
            const detailQuery = `
                SELECT 
                    dm.DishGroupId, 
                    dm.DishGroupIdName, 
                    dm.DishCode, 
                    dm.Name as DishName, 
                    od.Quantity, 
                    od.ManualDiscountAmount, 
                    od.BaseAmount, 
                    od.TotalDetailLineAmount, 
                    pd.BillNumber
                FROM (
                    SELECT * FROM dbo.vw_RestaurantOrder
                    UNION ALL
                    SELECT * FROM dbo.vw_RestaurantOrderCur
                ) ro
                INNER JOIN (
                    SELECT * FROM dbo.vw_RestaurantOrderDetail
                    UNION ALL
                    SELECT * FROM dbo.vw_RestaurantOrderDetailCur
                ) od ON ro.OrderId = od.OrderId
                INNER JOIN (
                    SELECT * FROM dbo.vw_PaymentDetail
                    UNION ALL
                    SELECT * FROM dbo.vw_PaymentDetailCur
                ) pd ON ro.OrderId = pd.OrderId
                INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
                WHERE CAST(ro.OrderDateTime AS DATE) BETWEEN @start AND @end
                ORDER BY dm.DishGroupId
            `;
            
            console.log("Executing Legacy Detail Query...");
            const result = await pool.request()
                .input('start', sql.Date, start)
                .input('end', sql.Date, end)
                .query(detailQuery);
            
            // Meta Query for Total Receipts
            const metaQuery = `
                SELECT 
                    COUNT(DISTINCT pd.BillNumber) as TotalReceipts,
                    ISNULL(SUM(DISTINCT pd.TotalAmountLessFreight), 0) as TotalNetSales
                FROM (
                    SELECT * FROM dbo.vw_PaymentDetail
                    UNION ALL
                    SELECT * FROM dbo.vw_PaymentDetailCur
                ) pd
                WHERE CAST(pd.OrderDateTime AS DATE) BETWEEN @start AND @end
            `;
            const metaResult = await pool.request()
                .input('start', sql.Date, start)
                .input('end', sql.Date, end)
                .query(metaQuery);

            const totalReceipts = metaResult.recordset[0]?.TotalReceipts || 0;
            const totalNetSales = metaResult.recordset[0]?.TotalNetSales || 0;
            const averageReceipt = totalReceipts > 0 ? (totalNetSales / totalReceipts).toFixed(2) : "0.00";

            console.log(`✅ Legacy Detail Query returned ${result.recordset.length} rows`);
            
            return res.json({ 
                success: true, 
                type: 'detail', 
                data: result.recordset,
                totalReceipts,
                averageReceipt,
                count: result.recordset.length,
                fromDate: start,
                toDate: end
            });

        } else {
            // SUMMARY REPORT QUERY with CASE statement
            const summaryQuery = `
                SELECT 
                    ISNULL(SUM(vrod.TotalDetailLineAmount), 0) as NetSales,
                    CASE 
                        WHEN MAX(CAST(dm.DishGroupCode AS VARCHAR(10))) = '1' THEN '-1'
                        WHEN MAX(CAST(dm.DishGroupCode AS VARCHAR(10))) = '9' THEN '-1'
                        ELSE MAX(CAST(dm.DishGroupCode AS VARCHAR(10)))
                    END as DishGroupName,
                    0 as ServiceCharge,
                    0 as TaxCollected,
                    ISNULL(SUM(vpd.RoundedBy), 0) as Rounding,
                    ISNULL(SUM(vpd.TotalDiscountAmount), 0) as TotalDiscount,
                    ISNULL(SUM(vrod.TotalDetailLineAmount), 0) + ISNULL(SUM(vpd.RoundedBy), 0) as TotalRevenue
                FROM (
                    SELECT * FROM dbo.vw_PaymentDetail
                    UNION ALL
                    SELECT * FROM dbo.vw_PaymentDetailCur
                ) vpd
                INNER JOIN (
                    SELECT * FROM dbo.vw_RestaurantOrderDetail
                    UNION ALL
                    SELECT * FROM dbo.vw_RestaurantOrderDetailCur
                ) vrod ON vpd.OrderId = vrod.OrderId
                INNER JOIN dbo.vw_DishMaster dm ON vrod.DishId = dm.DishId
                WHERE CAST(vpd.OrderDateTime AS DATE) BETWEEN @start AND @end
            `;

            console.log("Executing Legacy Summary Query...");
            const result = await pool.request()
                .input('start', sql.Date, start)
                .input('end', sql.Date, end)
                .query(summaryQuery);
            
            let dishGroupName = result.recordset[0]?.DishGroupName || '';
            
            const summaryData = {
                NetSales: result.recordset[0]?.NetSales || 0,
                DishGroupName: dishGroupName,
                ServiceCharge: result.recordset[0]?.ServiceCharge || 0,
                TaxCollected: result.recordset[0]?.TaxCollected || 0,
                TotalDiscount: result.recordset[0]?.TotalDiscount || 0,
                Rounding: result.recordset[0]?.Rounding || 0,
                TotalRevenue: result.recordset[0]?.TotalRevenue || 0
            };
            
            console.log("✅ Legacy Summary Query Result:", summaryData);
            
            return res.json({ 
                success: true, 
                type: 'summary', 
                data: summaryData,
                fromDate: start,
                toDate: end
            });
        }

    } catch (err) {
        console.error("🔥 Console Sales Report Error:", err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            details: err.toString()
        });
    }
});

// GET Console Sales Report by DishGroup
router.get("/group", async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const pool = await poolPromise;
        
        const start = fromDate || new Date().toISOString().split('T')[0];
        const end = toDate || new Date().toISOString().split('T')[0];

        const groupQuery = `
            SELECT 
                vrod.DishGroupName,
                ISNULL(SUM(vrod.TotalDetailLineAmount), 0) as TotalSales,
                ISNULL(SUM(vpd.RoundedBy), 0) as Rounding,
                ISNULL(SUM(vpd.TotalDiscountAmount), 0) as TotalDiscount
            FROM (
                SELECT * FROM dbo.vw_PaymentDetail
                UNION ALL
                SELECT * FROM dbo.vw_PaymentDetailCur
            ) vpd
            INNER JOIN (
                SELECT * FROM dbo.vw_RestaurantOrderDetail
                UNION ALL
                SELECT * FROM dbo.vw_RestaurantOrderDetailCur
            ) vrod ON vpd.OrderId = vrod.OrderId
            WHERE CAST(vpd.OrderDateTime AS DATE) BETWEEN @start AND @end
            GROUP BY vrod.DishGroupName
            ORDER BY vrod.DishGroupName
        `;

        const result = await pool.request()
            .input('start', sql.Date, start)
            .input('end', sql.Date, end)
            .query(groupQuery);

        return res.json({ 
            success: true, 
            data: result.recordset,
            fromDate: start,
            toDate: end
        });
    } catch (err) {
        console.error("🔥 Group Report Error:", err.message);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

module.exports = router;