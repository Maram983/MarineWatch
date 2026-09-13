/* MarineWatch - Public Pollution Hotspots
   No login required. Uses only approved reports from GET /api/reports/map.
   Groups reports by location and shows the most frequently reported areas,
   as a public awareness widget on the home page. */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    const box = document.getElementById("hotspotsBox");
    if (!box) return; // section not present on this page

    loadHotspots();

    async function loadHotspots() {
        try {
            // call the api
            const res = await fetch(window.apiUrl('/api/reports/map'));
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to load report data');

            const reports = (Array.isArray(data) ? data : data.reports || [])
                .filter((r) => !r.status || String(r.status).toLowerCase() === 'approved');

            renderHotspots(reports);
        } catch (err) {
            console.error('Unable to load pollution hotspots:', err);
            renderError();
        }
    }

    // render error
    function renderError() {
        box.innerHTML = `
            <div class="hotspots-state is-error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Unable to load pollution data right now. Please try again later.</span>
            </div>`;
    }

    // render empty
    function renderEmpty() {
        box.innerHTML = `
            <div class="hotspots-state">
                <i class="fa-regular fa-circle-check"></i>
                <span>No approved reports yet. Check back soon.</span>
            </div>`;
    }

    // render hotspots
    function renderHotspots(reports) {
        if (!reports.length) {
            renderEmpty();
            return;
        }

        // Group reports by location name (fallback to rounded coordinates).
        const groups = new Map();

        reports.forEach((r) => {
            const rawLocation = (r.location || r.place || '').toString().trim();
            const lat = Number(r.lat ?? r.latitude ?? 0);
            const lng = Number(r.lng ?? r.longitude ?? 0);
            const key = rawLocation || (Number.isFinite(lat) && Number.isFinite(lng)
                ? `${lat.toFixed(2)}, ${lng.toFixed(2)}`
                : 'Unknown location');

            if (!groups.has(key)) {
                groups.set(key, { name: key, count: 0, severities: { critical: 0, high: 0, medium: 0, low: 0 } });
            }

            const group = groups.get(key);
            group.count += 1;

            const sev = (r.severity || 'low').toString().toLowerCase();
            if (group.severities[sev] !== undefined) {
                group.severities[sev] += 1;
            }
        });

        // ranked
        const ranked = Array.from(groups.values()).sort((a, b) => b.count - a.count);
        const top = ranked.slice(0, 5);
        const maxCount = top[0] ? top[0].count : 1;
        const totalLocations = ranked.length;
        const totalReports = reports.length;

        // dominant severity class
        const dominantSeverityClass = (severities) => {
            const order = ['critical', 'high', 'medium', 'low'];
            let best = 'low';
            let bestCount = -1;
            order.forEach((key) => {
                if (severities[key] > bestCount) {
                    bestCount = severities[key];
                    best = key;
                }
            });
            return best;
        };

        // rows html
        const rowsHtml = top.map((group, index) => {
            const widthPct = Math.max(6, Math.round((group.count / maxCount) * 100));
            const sevClass = dominantSeverityClass(group.severities);
            const escapedName = escapeHtml(group.name);

            return `
                <div class="hotspot-row">
                    <div class="hotspot-rank">${index + 1}</div>
                    <div class="hotspot-main">
                        <div class="hotspot-name">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>${escapedName}</span>
                        </div>
                        <div class="hotspot-bar-track">
                            <div class="hotspot-bar-fill" style="width:${widthPct}%"></div>
                        </div>
                    </div>
                    <div class="hotspot-count">
                        <strong><span class="hotspot-sev-dot ${sevClass}"></span>${group.count}</strong>
                        <span>${group.count === 1 ? 'report' : 'reports'}</span>
                    </div>
                </div>`;
        }).join('');

        box.innerHTML = `
            <div class="hotspots-summary">
                <div class="hs-stat">
                    <strong>${totalReports}</strong>
                    <span>Verified Reports</span>
                </div>
                <div class="hs-stat">
                    <strong>${totalLocations}</strong>
                    <span>Locations Affected</span>
                </div>
            </div>
            <div class="hotspots-list">
                ${rowsHtml}
            </div>`;
    }

    // escape html
    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }
});
