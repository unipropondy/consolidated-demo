import React, { useState } from "react";
import axios from "axios";
import "./ConsoleSalesReport.css";

const ConsoleSalesReport = ({ sidebarOpen }) => {
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    const [reportType, setReportType] = useState("summary");
    const [outputType, setOutputType] = useState("screen");
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [orgData, setOrgData] = useState(null);

    // Fetch organization info on mount
    React.useEffect(() => {
        axios.get('http://localhost:5000/api/organization')
            .then(res => setOrgData(res.data))
            .catch(err => console.error("Org fetch error:", err));
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    // Logo and Company Header
    const CompanyHeader = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '2px solid #ff7f27',
            paddingBottom: '15px'
        }}>
            <img
                src="https://uniprosg.com/wp-content/uploads/2024/09/unipro-logo-green-1.png"
                alt="Unipro Logo"
                style={{ maxWidth: '100px', maxHeight: '50px' }}
            />
            <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6d645e', fontFamily: 'Cambria, Times New Roman, serif' }}>
                    {orgData?.Name || "UNIPRO SOFTWARES SG PTE LTD"}
                </div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '4px', fontFamily: 'Cambria, Times New Roman, serif' }}>
                    {orgData?.Address1_Line1 || "45 KALLANG PUDDING ROAD"}, {orgData?.Address1_City || "SINGAPORE"} {orgData?.Address1_PostalCode || "349317"}<br/>
                    Phone: {orgData?.Address1_Telephone1 || "65130000"}
                </div>
            </div>
            <div style={{ width: '100px' }}></div>
        </div>
    );

    // Render Summary Report
    const renderSummaryReport = () => {
    if (!reportData || !reportData.data) {
        return <div className="der-empty">No data available</div>;
    }
    const data = reportData.data;
    
    // Get DishGroupName from the data
    const dishGroupName = data.DishGroupName || "";
    
    return (
        <table className="der-table">
            <thead>
                <tr><th>Particulars</th><th className="der-th-center">Amount</th></tr>
            </thead>
            <tbody>
                <tr className="der-section-header"><td colSpan="2">Report Total</td></tr>
                <tr><td>Net Sales</td><td className="der-text-right">{(data.NetSales || 0).toFixed(2)}</td></tr>
                <tr><td>Service Charge</td><td className="der-text-right">{(data.ServiceCharge || 0).toFixed(2)}</td></tr>
                <tr><td>Tax Collected</td><td className="der-text-right">{(data.TaxCollected || 0).toFixed(2)}</td></tr>
                <tr><td>Rounding & Excess</td><td className="der-text-right">{(data.Rounding || 0).toFixed(2)}</td></tr>
                <tr className="der-total-row"><td>Total Revenue</td><td className="der-text-right">{(data.TotalRevenue || 0).toFixed(2)}</td></tr>

                {/* Sales Section with DishGroupName */}
                <tr className="der-section-header"><td colSpan="2">Sales</td></tr>
                <tr>
                    <td style={{ paddingLeft: '20px' }}>{dishGroupName}</td>
                    <td className="der-text-right">{(data.NetSales || 0).toFixed(2)}</td>
                </tr>
                <tr className="der-total-row">
                    <td style={{ paddingLeft: '20px' }}>Total Sales</td>
                    <td className="der-text-right">{(data.NetSales || 0).toFixed(2)}</td>
                </tr>

                <tr className="der-section-header"><td colSpan="2">Tax & SVC</td></tr>
                <tr><td>Service Charge</td><td className="der-text-right">{(data.ServiceCharge || 0).toFixed(2)}</td></tr>
                <tr><td>Tax Collected</td><td className="der-text-right">{(data.TaxCollected || 0).toFixed(2)}</td></tr>

                <tr className="der-section-header"><td colSpan="2">Discount</td></tr>
                <tr><td>Total Discount</td><td className="der-text-right">{(data.TotalDiscount || 0).toFixed(2)}</td></tr>
            </tbody>
        </table>
    );
};

    // Render Detail Report
    const renderDetailReport = () => {
        if (!reportData || !reportData.data || !Array.isArray(reportData.data) || reportData.data.length === 0) {
            return <div className="der-empty">No data available</div>;
        }

        const groupedData = {};
        let grandTotalGross = 0;
        let grandTotalDiscount = 0;
        let grandTotalNet = 0;
        let grandTotalQuantity = 0;

        reportData.data.forEach(item => {
            const group = item.DishGroupIdName || 'Uncategorized';
            if (!groupedData[group]) groupedData[group] = [];
            groupedData[group].push(item);

            grandTotalGross += item.BaseAmount || 0;
            grandTotalDiscount += item.ManualDiscountAmount || 0;
            grandTotalNet += item.TotalDetailLineAmount || 0;
            grandTotalQuantity += item.Quantity || 0;
        });

        return (
            <table className="der-table">
                <thead>
                    <tr>
                        <th>DishCode</th>
                        <th>Name</th>
                        <th className="der-th-center">Qty</th>
                        <th className="der-th-center">%</th>
                        <th className="der-th-center">Gross</th>
                        <th className="der-th-center">Disc</th>
                        <th className="der-th-center">%</th>
                        <th className="der-th-center">Disc.Gross</th>
                        <th className="der-th-center">%</th>
                        <th className="der-th-center">Net</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(groupedData).map((group, gIdx) => {
                        let groupTotalGross = 0;
                        let groupTotalDiscount = 0;
                        let groupTotalNet = 0;
                        let groupTotalQty = 0;

                        return (
                            <React.Fragment key={gIdx}>
                                <tr className="der-section-header">
                                    <td colSpan="10">Dish Group : {group}</td>
                                </tr>
                                {groupedData[group].map((item, idx) => {
                                    groupTotalGross += item.BaseAmount || 0;
                                    groupTotalDiscount += item.ManualDiscountAmount || 0;
                                    groupTotalNet += item.TotalDetailLineAmount || 0;
                                    groupTotalQty += item.Quantity || 0;

                                    const grossPercent = grandTotalGross > 0 ? ((item.BaseAmount / grandTotalGross) * 100).toFixed(2) : "0.00";
                                    const netPercent = grandTotalNet > 0 ? ((item.TotalDetailLineAmount / grandTotalNet) * 100).toFixed(2) : "0.00";

                                    return (
                                        <tr key={idx}>
                                            <td>{item.DishCode || ""}</td>
                                            <td>{item.DishName || ""}</td>
                                            <td className="der-text-right">{item.Quantity || 0}</td>
                                            <td className="der-text-right">{grossPercent}%</td>
                                            <td className="der-text-right">{(item.BaseAmount || 0).toFixed(2)}</td>
                                            <td className="der-text-right">{(item.ManualDiscountAmount || 0).toFixed(2)}</td>
                                            <td className="der-text-right">0.00%</td>
                                            <td className="der-text-right">{(item.TotalDetailLineAmount || 0).toFixed(2)}</td>
                                            <td className="der-text-right">{netPercent}%</td>
                                            <td className="der-text-right">{(item.TotalDetailLineAmount || 0).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="der-total-row">
                                    <td colSpan="2">Group Total</td>
                                    <td className="der-text-right">{groupTotalQty}</td>
                                    <td></td>
                                    <td className="der-text-right">{groupTotalGross.toFixed(2)}</td>
                                    <td className="der-text-right">{groupTotalDiscount.toFixed(2)}</td>
                                    <td></td>
                                    <td className="der-text-right">{groupTotalNet.toFixed(2)}</td>
                                    <td></td>
                                    <td className="der-text-right">{groupTotalNet.toFixed(2)}</td>
                                </tr>
                            </React.Fragment>
                        );
                    })}

                    <tr className="der-total-row" style={{ backgroundColor: '#d1d8dd' }}>
                        <td colSpan="2">Grand Total</td>
                        <td className="der-text-right">{grandTotalQuantity}</td>
                        <td></td>
                        <td className="der-text-right">{grandTotalGross.toFixed(2)}</td>
                        <td className="der-text-right">{grandTotalDiscount.toFixed(2)}</td>
                        <td></td>
                        <td className="der-text-right">{grandTotalNet.toFixed(2)}</td>
                        <td></td>
                        <td className="der-text-right">{grandTotalNet.toFixed(2)}</td>
                    </tr>

                    <tr className="der-total-row">
                        <td colSpan="5" align="left">Total Receipts : {reportData.totalReceipts || 0}</td>
                        <td colSpan="5" align="right">Average/Receipt : {reportData.averageReceipt || "0.00"}</td>
                    </tr>
                </tbody>
            </table>
        );
    };


    const handleGenerate = async () => {
        if (!fromDate || !toDate) {
            alert("Please select From Date and To Date");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get("http://localhost:5000/api/consolesales", {
                params: {
                    type: reportType,
                    fromDate,
                    toDate
                }
            });
            if (response.data.success) {
                setReportData(response.data);
                if (outputType === "printer") {
                    setTimeout(() => { window.print(); }, 500);
                }
            } else {
                alert("Error: " + response.data.error);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            alert("Failed to fetch report data. Please check server connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!reportData) {
            alert("Please generate a report first");
            return;
        }

        const now = new Date();
        const printDate = now.toLocaleDateString('en-GB');
        const printTime = now.toLocaleTimeString('en-GB');

        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Consolidated Sales Report</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                body { 
                    font-family: 'Cambria', 'Times New Roman', serif; 
                    background: white; 
                    margin: 0; 
                    padding: 20px; 
                    display: flex; 
                    justify-content: center; 
                }
                .a4-page {
                    background: white;
                    width: 100%;
                    min-height: 297mm;
                    padding: 15px;
                    box-sizing: border-box;
                    color: #333;
                    display: flex;
                    flex-direction: column;
                }
                .report-body {
                    flex-grow: 1;
                }
                @media print {
                    @page { margin: 5mm; }
                    body { background: white; padding: 0; margin: 0; display: block; }
                    .a4-page { 
                        box-shadow: none; 
                        width: 100% !important; 
                        min-height: 282mm; 
                        padding: 5mm 10mm !important; 
                        margin: 0; 
                        border: none; 
                        display: flex;
                        flex-direction: column;
                    }
                    th, td { padding: 6px 10px !important; font-size: 10px; }
                    .header-container { margin-bottom: 15px; padding-bottom: 10px; }
                    .report-title { margin: 10px 0; font-size: 12px; }
                    .report-info { margin-bottom: 15px; padding: 5px; font-size: 11px; }
                    .signature { margin-top: 30px; }
                }
                .header-container { 
                    position: relative; 
                    text-align: center; 
                    border-bottom: 1px solid #34495e; 
                    padding-bottom: 15px; 
                    margin-bottom: 20px; 
                    min-height: 60px; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: center; 
                }
                .logo { 
                    position: absolute; 
                    left: 0; 
                    top: 50%; 
                    transform: translateY(-50%); 
                    max-width: 100px; 
                    max-height: 50px; 
                }
                .company-name { 
                    font-size: 18px; 
                    font-weight: bold; 
                    color: #2c3e50; 
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                .company-address { 
                    font-size: 11px; 
                    color: #7f8c8d; 
                    margin-top: 4px; 
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                .report-title { 
                    text-align: center; 
                    font-size: 14px; 
                    font-weight: bold; 
                    margin: 20px 0; 
                    color: #34495e; 
                    text-transform: uppercase; 
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                .report-info {
                    text-align: center;
                    margin-bottom: 25px;
                    font-size: 12px;
                    border: 1px solid #e0e0e0;
                    padding: 8px;
                    background: #f8f9fa;
                    color: #333;
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 15px 0; 
                    font-size: 11px; 
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                th, td { 
                    padding: 10px 12px; 
                    border: 1px solid #e0e0e0; 
                    text-align: left; 
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                th { 
                    background: #34495e; 
                    color: #ffffff; 
                    font-weight: bold; 
                    text-transform: uppercase;
                    text-align: center;
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                .section-head td {
                    background-color: #eaeff2 !important;
                    font-weight: bold;
                    color: #34495e;
                }
                .total-row td {
                    background-color: #f8f9fa !important;
                    font-weight: bold;
                }
                .footer { 
                    margin-top: 40px;
                    font-size: 10px; 
                    color: #95a5a6; 
                    padding-top: 15px; 
                    display: flex; 
                    justify-content: space-between; 
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                .signature {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    color: #333;
                    font-family: 'Cambria', 'Times New Roman', serif;
                }
                .amount-col {
                    text-align: right;
                }
                th.amount-col {
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="a4-page">
                <div class="report-body">
                    <div class="header-container">
                        <img src="https://uniprosg.com/wp-content/uploads/2024/09/unipro-logo-green-1.png" alt="Unipro Logo" class="logo" />
                        <div class="company-name">${orgData?.Name || "UNIPRO SOFTWARES SG PTE LTD"}</div>
                        <div class="company-address">
                            ${orgData?.Address1_Line1 || "45 KALLANG PUDDING ROAD"}, ${orgData?.Address1_City || "SINGAPORE"} ${orgData?.Address1_PostalCode || "349317"}<br/>
                            Phone: ${orgData?.Address1_Telephone1 || "65130000"}
                        </div>
                    </div>
                    
                    <div class="report-title">CONSOLIDATED SALES REPORT ${reportType.toUpperCase()}</div>
                    
                    <div class="report-info">
                        <strong>Period:</strong> ${formatDate(fromDate)} to ${formatDate(toDate)}
                    </div>
        `;

        if (reportType === "summary") {
            htmlContent += `
                <table>
                    <thead>
                        <tr>
                            <th>Particulars</th>
                            <th class="amount-col">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="section-head"><td colspan="2">Report Total</td></tr>
                        <tr><td>Net Sales</td><td class="amount-col">${(reportData.data.NetSales || 0).toFixed(2)}</td></tr>
                        <tr><td>Service Charge</td><td class="amount-col">${(reportData.data.ServiceCharge || 0).toFixed(2)}</td></tr>
                        <tr><td>Tax Collected</td><td class="amount-col">${(reportData.data.TaxCollected || 0).toFixed(2)}</td></tr>
                        <tr><td>Rounding & Excess</td><td class="amount-col">${(reportData.data.Rounding || 0).toFixed(2)}</td></tr>
                        <tr class="total-row"><td>Total Revenue</td><td class="amount-col">${(reportData.data.TotalRevenue || 0).toFixed(2)}</td></tr>
                        
                        <tr class="section-head"><td colspan="2">Sales</td></tr>
                        <tr><td>Total Sales</td><td class="amount-col">${(reportData.data.NetSales || 0).toFixed(2)}</td></tr>
                        
                        <tr class="section-head"><td colspan="2">Tax & SVC</td></tr>
                        <tr><td>Service Charge</td><td class="amount-col">${(reportData.data.ServiceCharge || 0).toFixed(2)}</td></tr>
                        <tr><td>Tax Collected</td><td class="amount-col">${(reportData.data.TaxCollected || 0).toFixed(2)}</td></tr>
                        
                        <tr class="section-head"><td colspan="2">Discount</td></tr>
                        <tr><td>Total Discount</td><td class="amount-col">${(reportData.data.TotalDiscount || 0).toFixed(2)}</td></tr>
                    </tbody>
                </table>
            `;
        } else {
            htmlContent += `
                <table>
                    <thead>
                        <tr>
                            <th>DishCode</th>
                            <th>Name</th>
                            <th>Qty</th>
                            <th>%</th>
                            <th>Gross</th>
                            <th>Disc</th>
                            <th>%</th>
                            <th>Disc.Gross</th>
                            <th>%</th>
                            <th>Net</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            let grandTotalGross = 0;
            let grandTotalDiscount = 0;
            let grandTotalNet = 0;
            let grandTotalQuantity = 0;

            const groupedData = reportData.data.reduce((acc, item) => {
                const group = item.DishGroupIdName || "Uncategorized";
                if (!acc[group]) acc[group] = [];
                acc[group].push(item);
                grandTotalGross += item.BaseAmount || 0;
                grandTotalDiscount += item.ManualDiscountAmount || 0;
                grandTotalNet += item.TotalDetailLineAmount || 0;
                grandTotalQuantity += item.Quantity || 0;
                return acc;
            }, {});

            Object.keys(groupedData).forEach((group) => {
                let groupTotalGross = 0;
                let groupTotalDiscount = 0;
                let groupTotalNet = 0;
                let groupTotalQty = 0;

                htmlContent += `<tr class="section-head"><td colspan="10">Dish Group : ${group}</td></tr>`;

                groupedData[group].forEach((item) => {
                    groupTotalGross += item.BaseAmount || 0;
                    groupTotalDiscount += item.ManualDiscountAmount || 0;
                    groupTotalNet += item.TotalDetailLineAmount || 0;
                    groupTotalQty += item.Quantity || 0;

                    const grossPercent = grandTotalGross > 0 ? ((item.BaseAmount / grandTotalGross) * 100).toFixed(2) : "0.00";
                    const netPercent = grandTotalNet > 0 ? ((item.TotalDetailLineAmount / grandTotalNet) * 100).toFixed(2) : "0.00";

                    htmlContent += `
                        <tr>
                            <td>${item.DishCode || ""}</td>
                            <td>${item.DishName || ""}</td>
                            <td class="amount-col">${item.Quantity || 0}</td>
                            <td class="amount-col">${grossPercent}%</td>
                            <td class="amount-col">${(item.BaseAmount || 0).toFixed(2)}</td>
                            <td class="amount-col">${(item.ManualDiscountAmount || 0).toFixed(2)}</td>
                            <td class="amount-col">0.00%</td>
                            <td class="amount-col">${(item.TotalDetailLineAmount || 0).toFixed(2)}</td>
                            <td class="amount-col">${netPercent}%</td>
                            <td class="amount-col">${(item.TotalDetailLineAmount || 0).toFixed(2)}</td>
                        </tr>
                    `;
                });

                htmlContent += `
                    <tr class="total-row">
                        <td colspan="2">Group Total</td>
                        <td class="amount-col">${groupTotalQty}</td>
                        <td></td>
                        <td class="amount-col">${groupTotalGross.toFixed(2)}</td>
                        <td class="amount-col">${groupTotalDiscount.toFixed(2)}</td>
                        <td></td>
                        <td class="amount-col">${groupTotalNet.toFixed(2)}</td>
                        <td></td>
                        <td class="amount-col">${groupTotalNet.toFixed(2)}</td>
                    </tr>
                `;
            });

            htmlContent += `
                    <tr class="total-row" style="background-color: #d1d8dd !important;">
                        <td colspan="2">Grand Total</td>
                        <td class="amount-col">${grandTotalQuantity}</td>
                        <td></td>
                        <td class="amount-col">${grandTotalGross.toFixed(2)}</td>
                        <td class="amount-col">${grandTotalDiscount.toFixed(2)}</td>
                        <td></td>
                        <td class="amount-col">${grandTotalNet.toFixed(2)}</td>
                        <td></td>
                        <td class="amount-col">${grandTotalNet.toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="5" align="left">Total Receipts : ${reportData.totalReceipts || 0}</td>
                        <td colspan="5" align="right">Average/Receipt : ${reportData.averageReceipt || "0.00"}</td>
                    </tr>
                </tbody>
                </table>
            `;
        }

        htmlContent += `
                </div>

                <div class="signature">
                    <div>
                        <div style="border-top: 1px solid #333; width: 180px; padding-top: 5px; text-align: center;">Cashier Signature</div>
                    </div>
                    <div>
                        <div style="border-top: 1px solid #333; width: 180px; padding-top: 5px; text-align: center;">Authorized Signature</div>
                    </div>
                </div>

                <div class="footer">
                    <span>Printed On: ${printDate} ${printTime}</span>
                    <span>Powered by UNIPRO</span>
                </div>
            </div>
        </body>
        </html>
        `;

        const blob = new Blob([htmlContent], { type: "text/html" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `Sales_Report_${fromDate}_to_${toDate}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`console-sales-report ${sidebarOpen ? "sidebar-open" : ""}`}>
            <div className="der-header-title">Consolidated Sales Report</div>

            <div className="der-filter-container">
                <div className="der-filter-row">
                    <div className="der-filter-item"><label>Report Type</label><select value={reportType} onChange={(e) => setReportType(e.target.value)} className="der-date-picker" style={{ width: '120px' }}><option value="summary">Summary</option><option value="detail">Detail</option></select></div>
                    <div className="der-filter-item"><label>From Date</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="der-date-picker" /></div>
                    <div className="der-filter-item"><label>To Date</label><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="der-date-picker" /></div>
                </div>
                <div className="der-generate-row">
                    <button className="der-btn-generate" onClick={handleGenerate} disabled={loading}>
                        {loading ? "..." : "Generate"}
                    </button>
                    {reportData && (
                        <button className="der-download-btn" onClick={handleDownload} title="Download Report" style={{ marginLeft: '10px' }}>
                            <span style={{ marginRight: '8px' }}>⬇️</span> Report
                        </button>
                    )}
                </div>
            </div>

            <div className="der-table-container">
                {loading ? (
                    <div className="der-empty">Loading...</div>
                ) : reportData ? (
                    <div className="der-table-wrapper">
                        {reportData.type === "summary" ? renderSummaryReport() : renderDetailReport()}
                    </div>
                ) : (
                    <div className="der-empty">Select filters and click Generate to see results</div>
                )}
            </div>
        </div>
    );
};

export default ConsoleSalesReport;