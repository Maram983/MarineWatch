/* MarineWatch - My Reports */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    let reports = [];

    // normalize report
    function normalizeReport(report) {
        const rawDate = report.observed_date || report.date || report.created_at || report.createdAt || "";
        return {
            id: String(report.id || report.report_id || ""),
            title: report.title || report.name || "Untitled report",
            type: report.type || report.pollution_type || "General",
            severity: (report.severity || "medium").toLowerCase(),
            status: report.status || "pending",
            rawDate,
            date: MW.formatDateString(rawDate || "Unknown"),
            location: report.location || "Unknown location",
            description: report.description || "No description available.",
            reporter: report.full_name || report.reporter || report.email || "Unknown reporter"
        };
    }

    async function loadReports() {
        // read saved value
        const token = localStorage.getItem("mw_token");
        if (!token) {
            mwToast("Please log in to load your reports.", "warn");
            reports = [];
            return;
        }

        try {
            // call the api
            const response = await fetch(window.apiUrl("/api/reports"), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not load reports.");
            reports = Array.isArray(data) ? data.map(normalizeReport) : [];
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not load your reports.", "error");
            reports = [];
        }
    }

    // update statistics
    function updateStatistics() {
        const totalReportsNode = document.getElementById("totalReports");
        const approvedReportsNode = document.getElementById("approvedReports");
        const pendingReportsNode = document.getElementById("pendingReports");
        const rejectedReportsNode = document.getElementById("rejectedReports");

        if (totalReportsNode) totalReportsNode.textContent = reports.length;
        if (approvedReportsNode) approvedReportsNode.textContent = reports.filter(r => r.status === "approved").length;
        if (pendingReportsNode) pendingReportsNode.textContent = reports.filter(r => r.status === "pending").length;
        if (rejectedReportsNode) rejectedReportsNode.textContent = reports.filter(r => r.status === "rejected").length;
    }

    let currentPage = 1;
    const itemsPerPage = 6;

    // render cards
    function renderCards(reportList) {
        // Card view removed; list-only display is used in My Reports.
    }

    // render pagination
    function renderPagination(totalPages) {
        const pagination = document.getElementById("pagination");
        if (!pagination) return;

        if (totalPages <= 1) {
            pagination.innerHTML = "";
            return;
        }

        let html = `<button ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage - 1}"><i class="fa-solid fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i += 1) {
            html += `<button data-page="${i}" class="${i === currentPage ? "active" : ""}">${i}</button>`;
        }
        html += `<button ${currentPage === totalPages ? "disabled" : ""} data-page="${currentPage + 1}"><i class="fa-solid fa-chevron-right"></i></button>`;

        pagination.innerHTML = html;
        pagination.querySelectorAll("button").forEach((button) => {
            // handle click
            button.addEventListener("click", () => {
                currentPage = Number(button.dataset.page);
                applyFilters();
            });
        });
    }

    // apply filters
    function applyFilters() {
        const searchText = document.getElementById("q")?.value.toLowerCase().trim() || "";
        const selectedType = document.getElementById("fType")?.value || "";
        const selectedStatus = document.getElementById("fStatus")?.value || "";
        const sortBy = document.getElementById("fSort")?.value || "";

        // filtered reports
        let filteredReports = reports.filter(report => {
            const matchesSearch = !searchText || report.title.toLowerCase().includes(searchText) || (report.location || "").toLowerCase().includes(searchText) || report.id.toLowerCase().includes(searchText);
            const matchesType = !selectedType || report.type === selectedType;
            const matchesStatus = !selectedStatus || report.status === selectedStatus;
            return matchesSearch && matchesType && matchesStatus;
        });

        if (sortBy === "dateAsc") {
            filteredReports.sort((a, b) => String(a.rawDate || "").localeCompare(String(b.rawDate || "")));
        } else if (sortBy === "severity") {
            const rank = { critical: 4, high: 3, medium: 2, low: 1 };
            filteredReports.sort((a, b) => rank[b.severity] - rank[a.severity]);
        } else {
            filteredReports.sort((a, b) => String(b.rawDate || "").localeCompare(String(a.rawDate || "")));
        }

        const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
        if (currentPage > totalPages) currentPage = 1;

        const pageReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        if (typeof MW !== "undefined" && MW.renderReportsRows) {
            MW.renderReportsRows("tableRows", pageReports, { actions: true });
        }
        renderPagination(totalPages);

        if (!filteredReports.length) {
            const tableBody = document.getElementById("tableRows");
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="mw-empty">
                                <i class="fa-solid fa-inbox"></i>
                                <h4>No reports found</h4>
                                <p>No reports match your search.</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    ["q", "fType", "fStatus", "fSort"].forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        // handle input
        element.addEventListener("input", () => {
            currentPage = 1;
            applyFilters();
        });
    });


    async function init() {
        await loadReports();
        updateStatistics();
        applyFilters();
    }

    init();
});
