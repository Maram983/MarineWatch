/* MarineWatch - Dashboard Helpers */

window.MW = window.MW || {};

/* ------------------------------
   Severity Badge
------------------------------ */

MW.severityBadge = function (severity) {

    const severityTypes = {

        low: ["green", "Low"],
        medium: ["amber", "Medium"],
        high: ["red", "High"],
        critical: ["red", "Critical"]

    };

    const badgeData =
        severityTypes[severity] || ["gray", severity];

    return `
        <span class="mw-badge mw-badge-${badgeData[0]}">
            ${badgeData[1]}
        </span>
    `;

};

/* ------------------------------
   Status Badge
------------------------------ */

MW.statusBadge = function (status) {

    const statusTypes = {

        pending: ["amber", "Pending"],
        approved: ["green", "Approved"],
        rejected: ["red", "Rejected"],
        resolved: ["blue", "Resolved"],
        investigating: ["teal", "Investigating"]

    };

    const badgeData =
        statusTypes[status] || ["gray", status];

    return `
        <span class="mw-badge mw-badge-${badgeData[0]}">
            ${badgeData[1]}
        </span>
    `;

};

/* Demo/sample reports removed — backend is the single source of truth. */

/* ------------------------------
   Render Report Rows
------------------------------ */

MW.formatReportDate = function (report) {
    if (!report) return "Unknown";

    const rawValue = report.observed_date || report.date || report.created_at || report.createdAt || report.reported_at || report.report_date || report.observation_date;
    if (!rawValue) return "Unknown";

    const parsed = new Date(rawValue);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    return String(rawValue);
};

MW.renderReportsRows = function (

    hostId,
    reportList,
    options = {}

) {

    const tableBody =
        document.getElementById(hostId);

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = reportList.map((report) => {

        const actionsColumn = options.actions
            ? `
                <td data-label="Actions">

                    <a
                        href="report-details.html?id=${report.id}"
                        class="btn btn-ghost btn-sm"
                    >

                        <i class="fa-solid fa-eye"></i>

                    </a>

                </td>
            `
            : "";

        return `

            <tr>

                <td data-label="Title">

                    <a
                        href="report-details.html?id=${report.id}"
                        style="font-weight:700;color:var(--mw-navy)"
                    >

                        ${report.title}

                    </a>

                    <br>

                    <small class="text-muted-2">

                        ${report.id} · ${report.location}

                    </small>

                </td>

                <td data-label="Type">

                    ${report.type}

                </td>

                <td data-label="Severity">

                    ${MW.severityBadge(report.severity)}

                </td>

                <td data-label="Status">

                    ${MW.statusBadge(report.status)}

                </td>

                <td data-label="Date">

                    ${MW.formatReportDate(report)}

                </td>

                ${actionsColumn}

            </tr>

        `;

    }).join("");

};