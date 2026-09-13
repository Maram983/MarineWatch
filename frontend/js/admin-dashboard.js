/* MarineWatch - Admin Dashboard */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    // read saved value
    const token = localStorage.getItem("mw_token");
    const totalReportsEl = document.getElementById("adminTotalReports");
    const pendingReportsEl = document.getElementById("adminPendingReports");
    const approvedReportsEl = document.getElementById("adminApprovedReports");
    const rejectedReportsEl = document.getElementById("adminRejectedReports");
    const submittedSummaryEl = document.getElementById("adminSummarySubmitted");
    const approvedSummaryEl = document.getElementById("adminSummaryApproved");
    const pendingSummaryEl = document.getElementById("adminSummaryPending");
    const rejectedSummaryEl = document.getElementById("adminSummaryRejected");
    const latestRows = document.getElementById("latestRows");
    const reportsChart = document.getElementById("repChart");
    const typeChart = document.getElementById("typeChart");

    let reports = [];

    // format month label
    function formatMonthLabel(key) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const parts = key.split("-");
        const month = Number(parts[1]) - 1;
        return `${monthNames[month] || parts[1]} ${parts[0]}`;
    }

    // render report stats
    function renderReportStats(list) {
        // status counts
        const statusCounts = list.reduce((acc, report) => {
            const status = (report.status || "").toLowerCase();
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const total = list.length;
        const approved = statusCounts.approved || 0;
        const pending = statusCounts.pending || 0;
        const rejected = statusCounts.rejected || 0;

        if (totalReportsEl) totalReportsEl.textContent = total;
        if (approvedReportsEl) approvedReportsEl.textContent = approved;
        if (pendingReportsEl) pendingReportsEl.textContent = pending;
        if (rejectedReportsEl) rejectedReportsEl.textContent = rejected;
        if (submittedSummaryEl) submittedSummaryEl.textContent = total;
        if (approvedSummaryEl) approvedSummaryEl.textContent = approved;
        if (pendingSummaryEl) pendingSummaryEl.textContent = pending;
        if (rejectedSummaryEl) rejectedSummaryEl.textContent = rejected;
    }

    // render admin stats
    function renderAdminStats(reportStats) {
        const total = reportStats.totalReports ?? reportStats.total ?? reportStats.count ?? 0;
        const approved = reportStats.approvedReports ?? reportStats.approved ?? (reportStats.status && reportStats.status.approved) ?? 0;
        const pending = reportStats.pendingReports ?? reportStats.pending ?? (reportStats.status && reportStats.status.pending) ?? 0;
        const rejected = reportStats.rejectedReports ?? reportStats.rejected ?? Math.max(0, total - approved - pending);

        if (totalReportsEl) totalReportsEl.textContent = total;
        if (approvedReportsEl) approvedReportsEl.textContent = approved;
        if (pendingReportsEl) pendingReportsEl.textContent = pending;
        if (rejectedReportsEl) rejectedReportsEl.textContent = rejected;
        if (submittedSummaryEl) submittedSummaryEl.textContent = total;
        if (approvedSummaryEl) approvedSummaryEl.textContent = approved;
        if (pendingSummaryEl) pendingSummaryEl.textContent = pending;
        if (rejectedSummaryEl) rejectedSummaryEl.textContent = rejected;
    }

    // render latest reports
    function renderLatestReports() {
        if (!latestRows) return;
        if (!reports.length) {
            latestRows.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="mw-empty">
                            <i class="fa-solid fa-inbox"></i>
                            <div>No reports available.</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        MW.renderReportsRows("latestRows", reports.slice(0, 3));
    }

    // render reports chart
    function renderReportsChart() {
        if (!reportsChart || !window.Chart) return;

        const now = new Date();
        const months = [];
        for (let offset = 5; offset >= 0; offset -= 1) {
            const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
            months.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
        }

        // submitted
        const submitted = months.map(() => 0);
        // approved
        const approved = months.map(() => 0);

        reports.forEach((report) => {
            const key = (report.created_at || report.observed_date || report.date || "").toString().slice(0, 7);
            const index = months.indexOf(key);
            if (index !== -1) {
                submitted[index] += 1;
                if ((report.status || "").toLowerCase() === "approved") {
                    approved[index] += 1;
                }
            }
        });

        if (window.adminReportsChart) window.adminReportsChart.destroy();
        window.adminReportsChart = new Chart(reportsChart, {
            type: "line",
            data: {
                labels: months.map(formatMonthLabel),
                datasets: [
                    {
                        label: "Submitted",
                        data: submitted,
                        borderColor: "#1976D2",
                        backgroundColor: "rgba(25,118,210,.12)",
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2
                    },
                    {
                        label: "Approved",
                        data: approved,
                        borderColor: "#10B981",
                        backgroundColor: "rgba(16,185,129,.1)",
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                plugins: {
                    legend: { position: "bottom" }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: "#EEF2F7" } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // render type chart
    function renderTypeChart() {
        if (!typeChart || !window.Chart) return;

        // counts
        const counts = reports.reduce((acc, report) => {
            const type = (report.type || report.pollution_type || "Unknown").toString();
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(counts);
        // values
        const values = labels.map((label) => counts[label]);
        const colors = ["#1976D2", "#0A2540", "#EF4444", "#00A7B5", "#F59E0B", "#10B981", "#8B5CF6", "#F97316"].slice(0, labels.length);

        if (window.adminTypeChart) window.adminTypeChart.destroy();
        window.adminTypeChart = new Chart(typeChart, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors }]
            },
            options: {
                plugins: {
                    legend: { position: "bottom" }
                },
                cutout: "62%"
            }
        });
    }

    async function loadAdminDashboard() {
        if (!token) {
            mwToast("Admin session required.", "error");
            return;
        }

        try {
            const [statsRes, reportsRes] = await Promise.all([
                // call the api
                fetch(window.apiUrl("/api/admin/stats"), { headers: { Authorization: `Bearer ${token}` } }),
                // call the api
                fetch(window.apiUrl("/api/admin/reports"), { headers: { Authorization: `Bearer ${token}` } })
            ]);
            const statsData = await statsRes.json();
            const reportsData = await reportsRes.json();

            if (!statsRes.ok) throw new Error(statsData.message || "Could not load admin stats.");
            if (!reportsRes.ok) throw new Error(reportsData.message || "Could not load admin reports.");

            reports = Array.isArray(reportsData) ? reportsData.slice().sort((a, b) => {
                const aDate = new Date(a.created_at || a.observed_date || a.date || 0).getTime();
                const bDate = new Date(b.created_at || b.observed_date || b.date || 0).getTime();
                return bDate - aDate;
            }) : [];

            // Prefer the stats endpoint for dashboard counts, but fall back to report list counts if needed.
            const reportStats = statsData.reports || statsData;
            if (reportStats && (typeof reportStats.totalReports === 'number' || typeof reportStats.total === 'number' || reportStats.status)) {
                renderAdminStats(reportStats);
            } else {
                renderReportStats(reports);
            }

            renderLatestReports();
            renderReportsChart();
            renderTypeChart();
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not load admin dashboard.", "error");
        }
    }

    loadAdminDashboard();
});
