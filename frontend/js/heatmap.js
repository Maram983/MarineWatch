/* MarineWatch - Public Regional Pollution Map
   No login required. Uses only approved reports from GET /api/reports/map,
   the same public endpoint the Community Insights (hotspots) widget uses.

   Each approved report is matched to its nearest coastal region of Saudi
   Arabia. Every region with reports gets a soft, blurred glow whose colour
   reflects how many/severe its reports are - green (low) through to red
   (critical). Regions with no approved reports show a small grey dot. */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    const container = document.getElementById("pollutionHeatmap");
    if (!container) return; // section not present on this page

    const stateEl = document.getElementById("heatmapState");

    /* Coastal regions/cities of Saudi Arabia that MarineWatch reports are
       expected to cluster around. Each approved report is assigned to the
       nearest one. Add more here as coverage grows. */
    const REGIONS = [
        { name: "Jeddah", lat: 21.5433, lng: 39.1728 },
        { name: "Rabigh", lat: 22.7986, lng: 39.0333 },
        { name: "Yanbu", lat: 24.0895, lng: 38.0618 },
        { name: "Umm Lujj", lat: 25.0159, lng: 37.2679 },
        { name: "Al Wajh", lat: 26.2360, lng: 36.4429 },
        { name: "Duba", lat: 27.3517, lng: 35.6892 },
        { name: "Haql", lat: 29.2874, lng: 34.9354 },
        { name: "Al Lith", lat: 20.1478, lng: 40.2698 },
        { name: "Jazan", lat: 16.8892, lng: 42.5511 },
        { name: "Farasan Islands", lat: 16.7047, lng: 42.1264 },
        { name: "Dammam", lat: 26.4207, lng: 50.0888 },
        { name: "Al Khobar", lat: 26.2172, lng: 50.1971 },
        { name: "Jubail", lat: 27.0046, lng: 49.6600 },
        { name: "Ras Tanura", lat: 26.6444, lng: 50.1590 },
        { name: "Qatif", lat: 26.5205, lng: 50.0089 }
    ];

    /* Severity weights used to score a region. Higher severity = more weight. */
    const SEVERITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

    /* Score -> tier: colour is fixed per tier, not blended along a shared
       scale, so two regions in different tiers always look visibly
       different (green vs yellow vs orange vs red). */
    const LEVELS = [
        { max: 0, label: "No Reports", color: "#B0BEC5" },
        { max: 3, label: "Low", color: "#2E7D32" },
        { max: 7, label: "Moderate", color: "#FBC02D" },
        { max: 14, label: "High", color: "#F57C00" },
        { max: Infinity, label: "Critical", color: "#C62828" }
    ];

    loadRegionMap();

    async function loadRegionMap() {
        try {
            // call the api
            const res = await fetch(window.apiUrl('/api/reports/map'));
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to load report data');

            const reports = (Array.isArray(data) ? data : data.reports || [])
                .filter((r) => !r.status || String(r.status).toLowerCase() === 'approved');

            renderMap(reports);
        } catch (err) {
            console.error('Unable to load regional pollution map:', err);
            renderError();
        }
    }

    // get point
    function getPoint(report) {
        const lat = Number(report.latitude || report.lat || report.latitude_raw || report.lat_raw);
        const lng = Number(report.longitude || report.lng || report.longitude_raw || report.lng_raw);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const severity = (report.severity || 'low').toString().toLowerCase();
        return { lat, lng, severity: SEVERITY_WEIGHT[severity] ? severity : 'low' };
    }

    // haversine km
    function haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // nearest region
    function nearestRegion(point) {
        let best = null;
        let bestDist = Infinity;
        REGIONS.forEach((region) => {
            const dist = haversineKm(point.lat, point.lng, region.lat, region.lng);
            if (dist < bestDist) {
                bestDist = dist;
                best = region;
            }
        });
        return best;
    }

    // level for
    function levelFor(score) {
        return LEVELS.find((tier) => score <= tier.max);
    }

    // set state
    function setState(html) {
        if (stateEl) stateEl.innerHTML = html;
        if (stateEl) stateEl.style.display = 'flex';
    }

    // hide state
    function hideState() {
        if (stateEl) stateEl.style.display = 'none';
    }

    // render error
    function renderError() {
        setState(`
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Unable to load pollution data right now. Please try again later.</span>`);
    }

    // glow icon
    function glowIcon(color) {
        return L.divIcon({
            className: '',
            iconSize: [140, 140],
            iconAnchor: [70, 70],
            html: `<div style="width:140px;height:140px;border-radius:50%;` +
                `background:radial-gradient(circle, ${color} 0%, ${color} 35%, transparent 72%);` +
                `opacity:.75;filter:blur(10px);"></div>`
        });
    }

    // render map
    function renderMap(reports) {
        hideState();

        /* Tally approved reports into their nearest region. */
        const stats = new Map(REGIONS.map((r) => [r.name, { region: r, count: 0, score: 0 }]));

        reports.forEach((report) => {
            const point = getPoint(report);
            if (!point) return;

            const region = nearestRegion(point);
            if (!region) return;

            const entry = stats.get(region.name);
            entry.count += 1;
            entry.score += SEVERITY_WEIGHT[point.severity] || 1;
        });

        const map = L.map(container, {
            zoomControl: true,
            scrollWheelZoom: false,
            attributionControl: true
        }).setView([23.8859, 45.0792], 6);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        stats.forEach((entry) => {
            const level = levelFor(entry.score);
            const tooltipHtml =
                `<strong>${entry.region.name}</strong><br>` +
                `${entry.count} approved ${entry.count === 1 ? 'report' : 'reports'}<br>` +
                `Pollution level: ${level.label}`;

            if (entry.count > 0) {
                // Soft blurred glow, in this region's own tier colour.
                L.marker([entry.region.lat, entry.region.lng], {
                    icon: glowIcon(level.color),
                    interactive: false,
                    keyboard: false
                }).addTo(map);
            }

            // Small hoverable marker on top, in every region (including
            // empty ones), so the tooltip always works and empty regions
            // still show a marker.
            L.circleMarker([entry.region.lat, entry.region.lng], {
                radius: entry.count > 0 ? 7 : 6,
                stroke: true,
                color: entry.count > 0 ? level.color : '#B0BEC5',
                weight: 2,
                fillColor: entry.count > 0 ? level.color : '#B0BEC5',
                fillOpacity: entry.count > 0 ? 0.9 : 0.5
            })
                .bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -4] })
                .addTo(map);
        });

        setTimeout(() => map.invalidateSize(), 150);
    }
});
