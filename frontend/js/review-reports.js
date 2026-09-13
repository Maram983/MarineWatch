/* MarineWatch - Review Reports */

// runs once the page is ready
document.addEventListener("mw:ready", () => {

    // read saved value
    const token = localStorage.getItem("mw_token");
    let reports = [];
    let activeTab = "pending";

    // normalize report
    function normalizeReport(report) {
        return {
            id: String(report.id || report.report_id || ""),
            title: report.title || report.name || "Untitled report",
            location: report.location || "Unknown location",
            type: report.type || report.pollution_type || "Unknown",
            severity: (report.severity || "medium").toString().toLowerCase(),
            status: report.status || "pending",
            date: MW.formatDateString(report.observed_date || report.date || report.created_at || report.createdAt || "Unknown"),
            description: report.description || "",
            reporter: report.full_name || report.reporter || report.email || "Unknown reporter"
        };
    }

    const tabPendingCount = document.getElementById('tab-pending-count');
    const tabApprovedCount = document.getElementById('tab-approved-count');
    const tabRejectedCount = document.getElementById('tab-rejected-count');
    const tabAllCount = document.getElementById('tab-all-count');

    // update tab counts
    function updateTabCounts() {
        // counts
        const counts = reports.reduce((acc, report) => {
            const status = (report.status || "pending").toLowerCase();
            acc[status] = (acc[status] || 0) + 1;
            acc.all += 1;
            return acc;
        }, { pending: 0, approved: 0, rejected: 0, all: 0 });

        if (tabPendingCount) tabPendingCount.textContent = counts.pending;
        if (tabApprovedCount) tabApprovedCount.textContent = counts.approved;
        if (tabRejectedCount) tabRejectedCount.textContent = counts.rejected;
        if (tabAllCount) tabAllCount.textContent = counts.all;
    }

    async function loadReports() {
        if (!token) {
            mwToast("Please log in as an admin to load report reviews.", "warn");
            reports = [];
            updateTabCounts();
            return;
        }

        try {
            // call the api
            const response = await fetch(window.apiUrl("/api/admin/reports"), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Could not load admin reports.");
            }

            reports = Array.isArray(data) ? data.map(normalizeReport) : [];
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not load admin reports.", "error");
            reports = [];
        }

        updateTabCounts();
    }

    async function refreshReports() {
        await loadReports();
        renderReports();
    }

    async function approveReport(id) {
        // report
        const report = reports.find((r) => r.id === id);
        if (!report) {
            mwToast("Report not found", "error");
            return;
        }

        if (!token) {
            mwToast("Please log in as an admin to approve reports.", "warn");
            return;
        }

        try {
            // call the api
            const response = await fetch(window.apiUrl(`/api/admin/reports/${encodeURIComponent(id)}/approve`), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Could not approve report.");
            }

            await refreshReports();
            mwToast("Report approved successfully", "success");
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not approve report.", "error");
        }
    }

    async function rejectReport(id) {
        // report
        const report = reports.find((r) => r.id === id);
        if (!report) {
            mwToast("Report not found", "error");
            return;
        }

        if (!token) {
            mwToast("Please log in as an admin to reject reports.", "warn");
            return;
        }

        try {
            // call the api
            const response = await fetch(window.apiUrl(`/api/admin/reports/${encodeURIComponent(id)}/reject`), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Could not reject report.");
            }

            await refreshReports();
            mwToast("Report rejected successfully", "success");
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not reject report.", "error");
        }
    }

    window.approveReport = approveReport;
    window.rejectReport = rejectReport;

    // render reports
    function renderReports() {
        const searchText = document.getElementById("q").value.toLowerCase().trim();
        const selectedType = document.getElementById("fType").value;
        const selectedSeverity = document.getElementById("fSev").value;

        // filtered reports
        const filteredReports = reports.filter((report) => {
            const matchesTab = activeTab === "all" || report.status === activeTab;
            const matchesSearch = !searchText || `${report.title} ${report.location} ${report.reporter}`
                .toLowerCase()
                .includes(searchText);
            const matchesType = !selectedType || report.type === selectedType;
            const matchesSeverity = !selectedSeverity || report.severity === selectedSeverity;
            return matchesTab && matchesSearch && matchesType && matchesSeverity;
        });

        const tableBody = document.getElementById("rows");

        if (filteredReports.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="mw-empty">
                            <i class="fa-solid fa-inbox"></i>
                            <div>No reports match filters.</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredReports
            .map((report) => {
                return `
                    <tr>
                        <td data-label="Report">
                            <a href="report-review.html?id=${report.id}" style="font-weight:700;color:var(--mw-navy)">${report.title}</a>
                            <br>
                            <small class="text-muted-2">${report.id} · ${report.location}</small>
                        </td>
                        <td data-label="Reporter">${report.reporter}</td>
                        <td data-label="Type">${report.type}</td>
                        <td data-label="Severity">${MW.severityBadge(report.severity)}</td>
                        <td data-label="Status">${MW.statusBadge(report.status)}</td>
                        <td data-label="Date">${MW.formatDateString(report.date)}</td>
                        <td data-label="Actions">
                            <div class="row-actions">
                                <button title="View" onclick="location.href='report-review.html?id=${report.id}'"><i class="fa-solid fa-eye"></i></button>
                                <button class="success" title="Approve" onclick="approveReport('${report.id}')"><i class="fa-solid fa-check"></i></button>
                                <button class="danger" title="Reject" onclick="rejectReport('${report.id}')"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join("");
    }

    document.querySelectorAll("#tabs button").forEach((button) => {
        // handle click
        button.addEventListener("click", () => {
            document.querySelectorAll("#tabs button").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            activeTab = button.dataset.tab;
            renderReports();
        });
    });

    ["q", "fType", "fSev"].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        // handle input
        input.addEventListener("input", renderReports);
    });

    loadReports().then(renderReports);

});
