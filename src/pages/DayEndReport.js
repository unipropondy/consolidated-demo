import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DayEndReport.css';

const DayEndReport = ({ sidebarOpen }) => {
    const [selectedDate, setSelectedDate] = useState("2025-11-21");
    const [reportData, setReportData] = useState(null);
    const [orgInfo, setOrgInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);

    useEffect(() => {
        const fetchAvailableDates = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/dayendreport/dates');
                if (response.data.success) {
                    setAvailableDates(response.data.dates);
                }
            } catch (error) {
                console.log("Could not fetch available dates");
            }
        };
        fetchAvailableDates();
    }, []);

    const formatDate = (d) => {
        if (!d) return "";
        const p = d.split("-");
        return `${p[2]}-${p[1]}-${p[0]}`;
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/api/dayendreport', {
                params: { fromDate: selectedDate, toDate: selectedDate }
            });

            console.log("API Response:", response.data);

            if (response.data.success) {
                const backendData = response.data;

                const formattedData = {
                    cashier: backendData.reportData?.cashier || "System",
                    receiptCount: backendData.reportData?.receiptCount || 0,
                    refNo: backendData.reportData?.refNo || "",
                    salesDetail: {
                        totalSales: backendData.reportData?.salesDetail?.totalSales || 0,
                        roundOff: backendData.reportData?.salesDetail?.roundOff || 0,
                        netTotal: backendData.reportData?.salesDetail?.netTotal || 0
                    },
                    paymodeDetail: backendData.reportData?.paymodeDetail || {},
                    settlementDetail: backendData.reportData?.settlementDetail || {},
                    analysis: backendData.reportData?.analysis || {},
                    voidDetail: backendData.reportData?.voidDetail || {}
                };

                setReportData(formattedData);
                setOrgInfo(backendData.orgInfo);
                setShowResults(true);
            } else {
                alert("No data found");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to fetch report data");
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
        const selectedDateFormatted = formatDate(selectedDate);

        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Day End Report - ${selectedDate}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                }
                body { 
                    font-family: 'Inter', sans-serif; 
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
                }
                .company-address { 
                    font-size: 11px; 
                    color: #7f8c8d; 
                    margin-top: 4px; 
                }
                .report-title { 
                    text-align: center; 
                    font-size: 14px; 
                    font-weight: bold; 
                    margin: 20px 0; 
                    color: #34495e; 
                    text-transform: uppercase; 
                }
                .report-info {
                    text-align: center;
                    margin-bottom: 25px;
                    font-size: 12px;
                    border: 1px solid #e0e0e0;
                    padding: 8px;
                    background: #f8f9fa;
                    color: #333;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 15px 0; 
                    font-size: 11px; 
                }
                th, td { 
                    padding: 10px 12px; 
                    border: 1px solid #e0e0e0; 
                    text-align: left; 
                }
                th { 
                    background: #34495e; 
                    color: #ffffff; 
                    font-weight: bold; 
                    text-transform: uppercase;
                    text-align: center;
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
                }
                .signature {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    color: #333;
                }
                .sig-line {
                    border-top: 1px solid #333;
                    width: 150px;
                    margin-top: 10px;
                    text-align: center;
                }
                .amount-col {
                    text-align: right;
                    width: 120px;
                }
                th.amount-col {
                    text-align: center;
                }
                .particulars-col {
                    display: flex;
                    justify-content: space-between;
                }
            </style>
        </head>
        <body>
            <div class="a4-page">
                <div class="report-body">
                    <div class="header-container">
                        <img src="https://uniprosg.com/wp-content/uploads/2024/09/unipro-logo-green-1.png" alt="Unipro Logo" class="logo" />
                        <div class="company-name">${orgInfo?.Name || "UNIPRO SOFTWARES SG PTE LTD"}</div>
                        <div class="company-address">
                            ${orgInfo?.Address1_Line1 || "45 KALLANG PUDDING ROAD"}, ${orgInfo?.Address1_City || "SINGAPORE"} ${orgInfo?.Address1_PostalCode || "349317"}<br/>
                            Phone: ${orgInfo?.Address1_Telephone1 || "65130000"}
                        </div>
                    </div>
                    
                    <div class="report-title">DAY END REPORT</div>
                    
                    <div class="report-info">
                        <strong>Date:</strong> ${selectedDateFormatted} &nbsp;&nbsp;|&nbsp;&nbsp;
                        <strong>Cashier:</strong> ${reportData.cashier || "System"} &nbsp;&nbsp;|&nbsp;&nbsp;
                        <strong>RefNo:</strong> ${reportData.refNo || "1"}
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Particulars</th>
                                <th class="amount-col">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Sales Detail Section -->
                            <tr class="section-head">
                                <td colspan="2">Sales Detail</td>
                            </tr>
                            <tr>
                                <td>Total Sales</td>
                                <td class="amount-col">${(reportData.salesDetail?.totalSales || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Round Off</td>
                                <td class="amount-col">${(reportData.salesDetail?.roundOff || 0).toFixed(2)}</td>
                            </tr>
                            <tr class="total-row">
                                <td>Total</td>
                                <td class="amount-col">${(reportData.salesDetail?.netTotal || 0).toFixed(2)}</td>
                            </tr>
                            
                            <!-- Paymode Detail Section -->
                            <tr class="section-head">
                                <td colspan="2">Paymode Detail</td>
                            </tr>
                            <tr>
                            <td>
                                <table style="width: 100%; border: none !important; margin: 0 !important; padding: 0 !important; background: transparent !important;">
                                    <tr>
                                        <td style="border: none !important; padding: 0 !important; text-align: left !important; background: transparent !important; color: inherit !important; font-weight: inherit !important;">CASH</td>
                                        <td style="border: none !important; padding: 0 !important; text-align: right !important; background: transparent !important; color: inherit !important; font-weight: inherit !important;">${reportData.receiptCount || 0}</td>
                                    </tr>
                                </table>
                            </td>
                            <td class="amount-col">${Object.values(reportData.paymodeDetail || {})[0]?.toFixed(2) || 0}</td>
                        </tr>
                            <tr class="total-row">
                                <td>Total</td>
                                <td class="amount-col">${Object.values(reportData.paymodeDetail || {}).reduce((a, b) => a + b, 0).toFixed(2)}</td>
                            </tr>
                            
                            <!-- Settlement Detail Section -->
                            <tr class="section-head">
                                <td colspan="2">Settlement Detail</td>
                            </tr>
                            <tr>
                                <td>Cash Total</td>
                                <td class="amount-col">${(reportData.settlementDetail?.cashTotal || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Other Total</td>
                                <td class="amount-col">${(reportData.settlementDetail?.otherTotal || 0).toFixed(2)}</td>
                            </tr>
                            
                            <!-- Analysis Section -->
                            <tr class="section-head">
                                <td colspan="2">Analysis</td>
                            </tr>
                            <tr>
                                <td>Sales Amount</td>
                                <td class="amount-col">${(reportData.analysis?.salesAmount || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>No of Bills</td>
                                <td class="amount-col">${reportData.analysis?.noOfBills || 0}</td>
                            </tr>
                            <tr>
                                <td>Avg/Bill</td>
                                <td class="amount-col">${(reportData.analysis?.avgPerBill || 0).toFixed(2)}</td>
                            </tr>
                            
                            <!-- Void Detail Section -->
                            <tr class="section-head">
                                <td colspan="2">Void Detail</td>
                            </tr>
                            <tr>
                                <td>Void Item Qty</td>
                                <td class="amount-col">${reportData.voidDetail?.voidItemQty || 0}</td>
                            </tr>
                            <tr>
                                <td>Void Item Amount</td>
                                <td class="amount-col">${(reportData.voidDetail?.voidItemAmount || 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
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
        link.download = `DayEndReport_${selectedDate}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`dayend-report ${sidebarOpen ? "sidebar-open" : ""}`}>
            <div className="der-header-title">Day End Report</div>

            <div className="der-filter-container">
                <div className="der-filter-row">
                    <div className="der-filter-item">
                        <label>DAY END DATE</label>
                        <input
                            type="date"
                            className="der-date-picker"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="der-generate-row">
                    <button className="der-btn-generate" onClick={handleGenerate} disabled={loading}>
                        {loading ? "Loading..." : "Generate"}
                    </button>
                </div>
            </div>

            <div className="der-results-heading">Result(s)</div>

            <div className="der-action-bar">
                {reportData && (
                    <button className="der-download-btn" onClick={handleDownload}>
                        <span style={{ marginRight: '8px' }}>⬇️</span> Report
                    </button>
                )}
            </div>

            <div className="der-table-container">
                {loading ? (
                    <div className="der-empty">Loading...</div>
                ) : showResults && reportData ? (
                    <div className="der-table-wrapper">
                        <table className="der-table">
                            <thead>
                                <tr>
                                    <th>Particulars</th>
                                    <th className="der-th-center">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Sales Detail Section */}
                                <tr className="der-section-header">
                                    <td colSpan="2">Sales Detail</td>
                                </tr>
                                <tr>
                                    <td>Total Sales</td>
                                    <td className="der-text-center">{(reportData.salesDetail?.totalSales || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Round Off</td>
                                    <td className="der-text-center">{(reportData.salesDetail?.roundOff || 0).toFixed(2)}</td>
                                </tr>
                                <tr className="der-total-row">
                                    <td><strong>Total</strong></td>
                                    <td className="der-text-center"><strong>{(reportData.salesDetail?.netTotal || 0).toFixed(2)}</strong></td>
                                </tr>

                                {/* Paymode Detail Section */}
                                <tr className="der-section-header">
                                    <td colSpan="2">Paymode Detail</td>
                                </tr>
                                {Object.entries(reportData.paymodeDetail || {}).map(([key, value]) => (
                                    <tr key={key}>
                                        <td className="der-particulars-cell">
                                            <span>{key}</span>
                                            <span className="der-particulars-right">{reportData.receiptCount || 0}</span>
                                        </td>
                                        <td className="der-text-center">{(value || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="der-total-row">
                                    <td><strong>Total</strong></td>
                                    <td className="der-text-center"><strong>{Object.values(reportData.paymodeDetail || {}).reduce((a, b) => a + b, 0).toFixed(2)}</strong></td>
                                </tr>

                                {/* Settlement Detail Section */}
                                <tr className="der-section-header">
                                    <td colSpan="2">Settlement Detail</td>
                                </tr>
                                <tr>
                                    <td>Cash Total</td>
                                    <td className="der-text-center">{(reportData.settlementDetail?.cashTotal || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Other Total</td>
                                    <td className="der-text-center">{(reportData.settlementDetail?.otherTotal || 0).toFixed(2)}</td>
                                </tr>

                                {/* Analysis Section */}
                                <tr className="der-section-header">
                                    <td colSpan="2">Analysis</td>
                                </tr>
                                <tr>
                                    <td>Sales Amount</td>
                                    <td className="der-text-center">{(reportData.analysis?.salesAmount || 0).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>No of Bills</td>
                                    <td className="der-text-center">{reportData.analysis?.noOfBills || 0}</td>
                                </tr>
                                <tr>
                                    <td>Avg/Bill</td>
                                    <td className="der-text-center">{(reportData.analysis?.avgPerBill || 0).toFixed(2)}</td>
                                </tr>

                                {/* Void Detail Section */}
                                <tr className="der-section-header">
                                    <td colSpan="2">Void Detail</td>
                                </tr>
                                <tr>
                                    <td>Void Item Qty</td>
                                    <td className="der-text-center">{reportData.voidDetail?.voidItemQty || 0}</td>
                                </tr>
                                <tr>
                                    <td>Void Item Amount</td>
                                    <td className="der-text-center">{(reportData.voidDetail?.voidItemAmount || 0).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="der-empty">Select date and click Generate to see results</div>
                )}
            </div>
        </div>
    );
};

export default DayEndReport;