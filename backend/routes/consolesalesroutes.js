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
            // COMMON QUERIES FOR SUMMARY + DETAIL

    const categorySalesQuery = `
        SELECT 
            dm.DishGroupIdName as CategoryName,
            SUM(od.TotalDetailLineAmount) as TotalSales,
            SUM(od.Quantity) as TotalQuantity
        FROM (
            SELECT * FROM dbo.vw_RestaurantOrderDetail
            UNION ALL
            SELECT * FROM dbo.vw_RestaurantOrderDetailCur
        ) od
        INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
        WHERE CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
        GROUP BY dm.DishGroupIdName
        ORDER BY TotalSales DESC
    `;

  let departmentSalesQuery = categorySalesQuery;

    const topItemsQuery = `
        SELECT TOP 10
            dm.DishCode,
            dm.Name as ItemName,
            dm.DishGroupIdName as Category,
            SUM(od.Quantity) as TotalQuantity,
            SUM(od.TotalDetailLineAmount) as TotalSales
        FROM (
            SELECT * FROM dbo.vw_RestaurantOrderDetail
            UNION ALL
            SELECT * FROM dbo.vw_RestaurantOrderDetailCur
        ) od
        INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
        WHERE CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
        GROUP BY dm.DishCode, dm.Name, dm.DishGroupIdName
        ORDER BY TotalSales DESC
    `;

    const slowItemsQuery = `
        SELECT TOP 10
            dm.DishCode,
            dm.Name as ItemName,
            dm.DishGroupIdName as Category,
            SUM(od.Quantity) as TotalQuantity,
            SUM(od.TotalDetailLineAmount) as TotalSales
        FROM (
            SELECT * FROM dbo.vw_RestaurantOrderDetail
            UNION ALL
            SELECT * FROM dbo.vw_RestaurantOrderDetailCur
        ) od
        INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
        WHERE CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
        GROUP BY dm.DishCode, dm.Name, dm.DishGroupIdName
        ORDER BY TotalSales ASC
    `;

    const slowCategoryQuery = `
        SELECT TOP 10
            dm.DishGroupIdName as CategoryName,
            SUM(od.TotalDetailLineAmount) as TotalSales,
            SUM(od.Quantity) as TotalQuantity
        FROM (
            SELECT * FROM dbo.vw_RestaurantOrderDetail
            UNION ALL
            SELECT * FROM dbo.vw_RestaurantOrderDetailCur
        ) od
        INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
        WHERE CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
        GROUP BY dm.DishGroupIdName
        ORDER BY TotalSales ASC
    `;
    
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
                        pd.BillNumber,
                    pd.PayModeName
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
            
                // Get Paymode Breakdown
                const summaryPaymodeQuery = `
                    SELECT 
                            pd.PayModeName,
                        COUNT(DISTINCT BillNumber) as TransactionCount,
                        SUM(TotalAmountLessFreight) as TotalAmount
                    FROM (
                        SELECT * FROM dbo.vw_PaymentDetail
                        UNION ALL
                        SELECT * FROM dbo.vw_PaymentDetailCur
                    ) pd
                    WHERE CAST(pd.OrderDateTime AS DATE) BETWEEN @start AND @end
                    GROUP BY PayModeName
                `;
                const paymodeResult = await pool.request()
                    .input('start', sql.Date, start)
                    .input('end', sql.Date, end)
                .query(summaryPaymodeQuery);
                console.log(paymodeResult.recordset);
                
                // Get Sales by Category (DishGroup)
                const categorySalesQuery = `
                    SELECT 
                        dm.DishGroupIdName as CategoryName,
                        SUM(od.TotalDetailLineAmount) as TotalSales,
                        SUM(od.Quantity) as TotalQuantity
                    FROM (
                        SELECT * FROM dbo.vw_RestaurantOrderDetail
                        UNION ALL
                        SELECT * FROM dbo.vw_RestaurantOrderDetailCur
                    ) od
                    INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
                    INNER JOIN (
                        SELECT DISTINCT OrderId FROM (
                            SELECT OrderId FROM dbo.vw_PaymentDetail
                            UNION ALL
                            SELECT OrderId FROM dbo.vw_PaymentDetailCur
                        ) p
                    ) p ON od.OrderId = p.OrderId
                    WHERE CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
                    GROUP BY dm.DishGroupIdName
                    ORDER BY TotalSales DESC
                `;
                const categoryResult = await pool.request()
                    .input('start', sql.Date, start)
                    .input('end', sql.Date, end)
                    .query(categorySalesQuery);
                
                // Get Sales by Department (using DishGroup as department)
                departmentSalesQuery = `
                    SELECT 
                        ISNULL(dm.DishGroupIdName, 'Uncategorized') as DepartmentName,
                        SUM(od.TotalDetailLineAmount) as TotalSales,
                        SUM(od.Quantity) as TotalQuantity
                    FROM (
                        SELECT * FROM dbo.vw_RestaurantOrderDetail
                        UNION ALL
                        SELECT * FROM dbo.vw_RestaurantOrderDetailCur
                    ) od
                    INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
                    INNER JOIN (
                        SELECT DISTINCT OrderId FROM (
                            SELECT OrderId FROM dbo.vw_PaymentDetail
                            UNION ALL
                            SELECT OrderId FROM dbo.vw_PaymentDetailCur
                        ) p
                    ) p ON od.OrderId = p.OrderId
                    WHERE CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
                    GROUP BY dm.DishGroupIdName
                    ORDER BY TotalSales DESC
                `;
                const departmentResult = await pool.request()
                    .input('start', sql.Date, start)
                    .input('end', sql.Date, end)
                    .query(departmentSalesQuery);
                
                // Get Top Selling Items
                const topItemsQuery = `
                    SELECT TOP 10
                        dm.DishCode,
                        dm.Name as ItemName,
                        dm.DishGroupIdName as Category,
                        SUM(od.Quantity) as TotalQuantity,
                        SUM(od.TotalDetailLineAmount) as TotalSales
                    FROM (
                        SELECT * FROM dbo.vw_RestaurantOrderDetail
                        UNION ALL
                        SELECT * FROM dbo.vw_RestaurantOrderDetailCur
                    ) od
                    INNER JOIN dbo.vw_DishMaster dm ON od.DishId = dm.DishId
                    INNER JOIN (
                        SELECT DISTINCT OrderId FROM (
                            SELECT OrderId FROM dbo.vw_PaymentDetail
                            UNION ALL
                            SELECT OrderId FROM dbo.vw_PaymentDetailCur
                        ) p
                    ) p ON od.OrderId = p.OrderId
                    WHERE CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
                    GROUP BY dm.DishCode, dm.Name, dm.DishGroupIdName
                    ORDER BY TotalSales DESC
                `;
                const topItemsResult = await pool.request()
                    .input('start', sql.Date, start)
                    .input('end', sql.Date, end)
                    .query(topItemsQuery);
                
                // Get Slow Moving Items (least sold)
                const slowItemsQuery = `
                    SELECT TOP 10
                        dm.DishCode,
                        dm.Name as ItemName,
                        dm.DishGroupIdName as Category,
                        ISNULL(SUM(od.Quantity), 0) as TotalQuantity,
                        ISNULL(SUM(od.TotalDetailLineAmount), 0) as TotalSales
                    FROM dbo.vw_DishMaster dm
                    LEFT JOIN (
                        SELECT * FROM dbo.vw_RestaurantOrderDetail
                        UNION ALL
                        SELECT * FROM dbo.vw_RestaurantOrderDetailCur
                    ) od ON dm.DishId = od.DishId 
                        AND CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
                    LEFT JOIN (
                        SELECT DISTINCT OrderId FROM (
                            SELECT OrderId FROM dbo.vw_PaymentDetail
                            UNION ALL
                            SELECT OrderId FROM dbo.vw_PaymentDetailCur
                        ) p
                    ) p ON od.OrderId = p.OrderId
                    WHERE dm.IsActive = 1
                    GROUP BY dm.DishCode, dm.Name, dm.DishGroupIdName
                    HAVING ISNULL(SUM(od.Quantity), 0) > 0
                    ORDER BY TotalSales ASC
                `;
                const slowItemsResult = await pool.request()
                    .input('start', sql.Date, start)
                    .input('end', sql.Date, end)
                    .query(slowItemsQuery);
                
                // Get Slow Moving Category
                const slowCategoryQuery = `
                    SELECT 
                        dm.DishGroupIdName as CategoryName,
                        ISNULL(SUM(od.TotalDetailLineAmount), 0) as TotalSales,
                        ISNULL(SUM(od.Quantity), 0) as TotalQuantity
                    FROM dbo.vw_DishMaster dm
                    LEFT JOIN (
                        SELECT * FROM dbo.vw_RestaurantOrderDetail
                        UNION ALL
                        SELECT * FROM dbo.vw_RestaurantOrderDetailCur
                    ) od ON dm.DishId = od.DishId 
                        AND CAST(od.OrderDateTime AS DATE) BETWEEN @start AND @end
                    LEFT JOIN (
                        SELECT DISTINCT OrderId FROM (
                            SELECT OrderId FROM dbo.vw_PaymentDetail
                            UNION ALL
                            SELECT OrderId FROM dbo.vw_PaymentDetailCur
                        ) p
                    ) p ON od.OrderId = p.OrderId
                    GROUP BY dm.DishGroupIdName
                    ORDER BY TotalSales ASC
                `;
                const slowCategoryResult = await pool.request()
                    .input('start', sql.Date, start)
                    .input('end', sql.Date, end)
                    .query(slowCategoryQuery);

                    // Meta Query for Total Transactions
    const summaryMetaQuery = `
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
    .query(summaryMetaQuery);

    const totalReceipts = metaResult.recordset[0]?.TotalReceipts || 0;

    const totalNetSales = metaResult.recordset[0]?.TotalNetSales || 0;

    const averageReceipt =
        totalReceipts > 0
            ? (totalNetSales / totalReceipts).toFixed(2)
            : "0.00";
                
                
                // Process Paymode data
             const paymodeBreakdown = {
    CASH: { amount: 0, count: 0 },
    CARD: { amount: 0, count: 0 },
    NETS: { amount: 0, count: 0 },
    CDC: { amount: 0, count: 0 },
    VOUCHER: { amount: 0, count: 0 },
    OTHERS: { amount: 0, count: 0 }
};
                
        paymodeResult.recordset.forEach(row => {

        const mode = row.PayModeName?.toUpperCase() || '';

        if (mode.includes('CASH')) {
            paymodeBreakdown.CASH.amount += row.TotalAmount || 0;

        } else if (mode.includes('CARD')) {
            paymodeBreakdown.CARD.amount += row.TotalAmount || 0;

        } else if (mode.includes('NETS')) {
            paymodeBreakdown.NETS.amount += row.TotalAmount || 0;

        } else if (mode.includes('CDC')) {
            paymodeBreakdown.CDC.amount += row.TotalAmount || 0;

        } else if (mode.includes('VOUCHER')) {
            paymodeBreakdown.VOUCHER.amount += row.TotalAmount || 0;

        } else {
            paymodeBreakdown.OTHERS.amount += row.TotalAmount || 0;
        }
    });
    
                console.log(`✅ Legacy Detail Query returned ${result.recordset.length} rows`);
            
                return res.json({
                    success: true,
                    type: 'detail',
                    data: result.recordset,
                    totalReceipts,
                    averageReceipt,
                    paymodeBreakdown,
                    salesByCategory: categoryResult.recordset,
                    salesByDepartment: departmentResult.recordset,
                    topSellingItems: topItemsResult.recordset,
                    slowMovingItems: slowItemsResult.recordset,
                    slowMovingCategory: slowCategoryResult.recordset,
                    count: result.recordset.length,
                    fromDate: start,
                    toDate: end
                });
    
            } else {



                // SUMMARY REPORT QUERY with CASE statement
                const summaryQuery = `
                    SELECT
                        ISNULL(SUM(vrod.TotalDetailLineAmount), 0) as NetSales,
                     MAX(CAST(vrod.DishGroupName AS VARCHAR(50))) as DishGroupName,
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

                    // Paymode Query
    const paymodeQuery = `
        SELECT 
        pd.PayModeName,
            COUNT(DISTINCT pd.BillNumber) as TransactionCount,
            SUM(pd.TotalAmountLessFreight) as TotalAmount
        FROM (
            SELECT * FROM dbo.vw_PaymentDetail
            UNION ALL
            SELECT * FROM dbo.vw_PaymentDetailCur
        ) pd
        WHERE CAST(pd.OrderDateTime AS DATE) 
            BETWEEN @start AND @end
    GROUP BY pd.PayModeName
    ORDER BY pd.PayModeName
    `;

    const paymodeResult = await pool.request()
        .input('start', sql.Date, start)
        .input('end', sql.Date, end)
        .query(paymodeQuery);

    // Process Paymode data
  const paymodeBreakdown = {
    CASH: { amount: 0, count: 0 },
    CARD: { amount: 0, count: 0 },
    NETS: { amount: 0, count: 0 },
    CDC: { amount: 0, count: 0 },
    VOUCHER: { amount: 0, count: 0 },
    OTHERS: { amount: 0, count: 0 }
};
    paymodeResult.recordset.forEach(row => {

    const mode = row.PayModeName?.toUpperCase() || '';

    if (mode.includes('CASH')) {
        paymodeBreakdown.CASH.amount += row.TotalAmount || 0;

    } else if (mode.includes('CARD')) {
        paymodeBreakdown.CARD.amount += row.TotalAmount || 0;

    } else if (mode.includes('NETS')) {
        paymodeBreakdown.NETS.amount += row.TotalAmount || 0;

    } else if (mode.includes('CDC')) {
        paymodeBreakdown.CDC.amount += row.TotalAmount || 0;

    } else if (mode.includes('VOUCHER')) {
        paymodeBreakdown.VOUCHER.amount += row.TotalAmount || 0;

    } else {
        paymodeBreakdown.OTHERS.amount += row.TotalAmount || 0;
    }
});
            
                    // Get Sales by Category
    const categoryResult = await pool.request()
        .input('start', sql.Date, start)
        .input('end', sql.Date, end)
        .query(categorySalesQuery);

    // Get Sales by Department
    const departmentResult = await pool.request()
        .input('start', sql.Date, start)
        .input('end', sql.Date, end)
        .query(departmentSalesQuery);

    // Get Top Selling Items
    const topItemsResult = await pool.request()
        .input('start', sql.Date, start)
        .input('end', sql.Date, end)
        .query(topItemsQuery);

    // Get Slow Moving Items
    const slowItemsResult = await pool.request()
        .input('start', sql.Date, start)
        .input('end', sql.Date, end)
        .query(slowItemsQuery);

    // Get Slow Moving Category
    const slowCategoryResult = await pool.request()
        .input('start', sql.Date, start)
        .input('end', sql.Date, end)
        .query(slowCategoryQuery);

        // Meta Query for Total Transactions
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

    const averageReceipt =
        totalReceipts > 0
            ? (totalNetSales / totalReceipts).toFixed(2)
            : "0.00";
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

        salesByCategory: categoryResult.recordset,
        salesByDepartment: departmentResult.recordset,
        topSellingItems: topItemsResult.recordset,
        slowMovingItems: slowItemsResult.recordset,
        slowMovingCategory: slowCategoryResult.recordset,

        totalReceipts,
        averageReceipt,
        paymodeBreakdown,

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
    
        } catch (err) {
            console.error("🔥 Group Report Error:", err.message);
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    });
    
    module.exports = router;