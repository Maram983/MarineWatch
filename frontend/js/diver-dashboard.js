/* MarineWatch - Diver Dashboard */

(function () {
    let initialized = false;

    // get stored user
    function getStoredUser() {
        // read saved value
        return JSON.parse(localStorage.getItem("mw_user") || "{}") || {};
    }

    async function loadDiverDashboard() {
        if (initialized) return;
        initialized = true;

        // read saved value
        const token = localStorage.getItem("mw_token");
        const storedUser = getStoredUser();
        const currentUserId = storedUser.id || null;
        const heroTitle = document.querySelector(".dash-hero h2");
        const heroMessage = document.getElementById("dashHeroMessage");

        if (heroTitle) {
            heroTitle.textContent = `Welcome back, ${storedUser.full_name || "there"}!`;
        }

        let reports = [];
        let loadError = null;

        try {
            // call the api
            const res = await fetch(window.apiUrl("/api/reports"), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to load reports");
            reports = Array.isArray(data) ? data : data.reports || [];
        } catch (err) {
            console.error("Error loading diver reports:", err);
            loadError = err;
            reports = [];
        }

        const recentHost = document.getElementById("recentReports");
        let filtered = reports;
        if (currentUserId) {
            filtered = reports.filter((report) => {
                const rid = report.user_id || report.userId || report.reporter_id || (report.reporter && report.reporter.id);
                return String(rid) === String(currentUserId) || String((report.reporter && report.reporter.id) || report.user_id || "") === String(currentUserId);
            });
        }

        // stats
        const stats = filtered.reduce((acc, report) => {
            const status = (report.status || "").toLowerCase();
            acc.total += 1;
            if (status === "approved") acc.approved += 1;
            if (status === "pending") acc.pending += 1;
            return acc;
        }, { total: 0, approved: 0, pending: 0 });

        document.getElementById("diverTotalReports").textContent = stats.total;
        document.getElementById("diverApprovedReports").textContent = stats.approved;
        document.getElementById("diverPendingReports").textContent = stats.pending;
        document.getElementById("diverDivesCount").textContent = stats.total;

        if (heroMessage) {
            heroMessage.innerHTML = loadError
                ? `<span class="text-danger">Unable to load your reports right now. Please try again.</span>`
                : ``;
        }

        if (loadError) {
            if (recentHost) {
                recentHost.innerHTML = `<tr><td colspan="5"><div class="mw-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Unable to load your reports. Please try again.</div></div></td></tr>`;
            }
        } else {
            MW.renderReportsRows("recentReports", filtered.slice(0, 2));
        }

        const chartCanvas = document.getElementById("reportsChart");
        if (chartCanvas && window.Chart) {
            const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const submitted = new Array(12).fill(0);
            const approved = new Array(12).fill(0);

            reports.forEach((report) => {
                const dateStr = report.observed_date || report.created_at || report.date || report.createdAt;
                const date = dateStr ? new Date(dateStr) : null;
                const month = date && !Number.isNaN(date.getTime()) ? date.getMonth() : null;
                const status = (report.status || report.state || "submitted").toLowerCase();
                if (month !== null) {
                    submitted[month] += 1;
                    if (status === "approved") approved[month] += 1;
                }
            });

            new Chart(chartCanvas, {
                type: "line",
                data: {
                    labels: monthLabels,
                    datasets: [
                        {
                            label: "Submitted",
                            data: submitted,
                            borderColor: "#1976D2",
                            backgroundColor: "rgba(25,118,210,.15)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.35,
                            pointBackgroundColor: "#1976D2"
                        },
                        {
                            label: "Approved",
                            data: approved,
                            borderColor: "#10B981",
                            backgroundColor: "rgba(16,185,129,.1)",
                            borderWidth: 2,
                            fill: true,
                            tension: 0.35,
                            pointBackgroundColor: "#10B981"
                        }
                    ]
                },
                options: {
                    plugins: { legend: { position: "bottom" } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: "#EEF2F7" } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        const mapElement = document.getElementById("dashMap");
        if (mapElement && window.L) {
            const map = L.map(mapElement, { scrollWheelZoom: false, zoomControl: false }).setView([23.5, 42.5], 5);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "© OSM © CARTO" }).addTo(map);

            let mapReports = [];
            try {
                // call the api
                const res = await fetch(window.apiUrl("/api/reports/map"), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to load map reports");
                mapReports = Array.isArray(data) ? data : data.reports || [];
            } catch (err) {
                console.error("Error loading map reports:", err);
                const mapHost = document.getElementById("dashMap");
                if (mapHost) {
                    mapHost.innerHTML = `<div class="mw-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Unable to load map data. Please try again.</div></div>`;
                }
                return;
            }

            const colors = { low: "#10B981", medium: "#F59E0B", high: "#EF4444", critical: "#7F1D1D" };
            mapReports.forEach((report) => {
                const lat = report.lat ?? report.latitude ?? report.lat_value ?? report.latVal;
                const lng = report.lng ?? report.longitude ?? report.lng_value ?? report.lngVal;
                const severity = (report.severity || report.risk || "low").toLowerCase();
                if (!lat || !lng) return;

                L.circleMarker([lat, lng], { radius: 8, color: "#fff", weight: 2, fillColor: colors[severity] || colors.low, fillOpacity: 0.95 })
                    .bindPopup(`<b>${report.title || report.name || "Report"}</b><br><small>${report.location || report.place || ""}</small>`)
                    .addTo(map);
            });
        }
    }

    if (document.readyState === "loading") {
        // runs once the dom is ready
        document.addEventListener("DOMContentLoaded", loadDiverDashboard);
    } else {
        loadDiverDashboard();
    }

    // runs once the page is ready
    document.addEventListener("mw:ready", loadDiverDashboard);
})();