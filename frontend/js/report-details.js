/* MarineWatch - Report Details */

if (typeof window !== "undefined") {
    window.MW = window.MW || {};
}

// resolve report value
function resolveReportValue(report, keys, fallback = "") {
    if (!report) return fallback;

    for (const key of keys) {
        const value = report[key];
        if (value !== null && value !== undefined && value !== "") {
            return String(value);
        }
    }

    return fallback;
}

// get display date
function getDisplayDate(report) {
    const rawValue = resolveReportValue(report, ["observed_date", "observation_date", "report_date", "date", "created_at"], null);
    const formatted = MW.formatDateString(rawValue || "");
    return formatted || "—";
}

// get display location
function getDisplayLocation(report, lat, lng) {
    if (lat !== null && lng !== null) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const locationValue = resolveReportValue(report, ["location", "city", "place"], "");
    return locationValue || "Location unavailable";
}

// get display description
function getDisplayDescription(report) {
    return resolveReportValue(report, ["description", "details", "report_description"], "No description provided.");
}

// get report images
function getReportImages(images) {
    if (!Array.isArray(images)) return [];

    return images
        .map((image) => image?.image_path || image?.path || image?.url || "")
        .map((raw) => raw && String(raw).trim())
        .filter((raw) => raw)
        .map((raw) => raw.startsWith("http") ? raw : `${window.API_BASE_URL}${raw}`);
}

// runs once the page is ready
document.addEventListener("mw:ready", async () => {

    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("id");

    if (!reportId) {
        document.getElementById("rTitle").textContent = "Report not found";
        document.getElementById("rMeta").textContent = "";
        return;
    }

    let report = null;
    let images = [];
    // read saved value
    const token = localStorage.getItem("mw_token");

    if (token) {
        try {
            // call the api
            const response = await fetch(window.apiUrl(`/api/reports/${reportId}`), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Could not load report details.");
            }

            report = data.report;
images = data.images || [];
report.reporter = data.reporter || null;
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not load report details.", "warn");
        }
    }

    if (!report) {
        document.getElementById("rTitle").textContent = "Report not available";
        document.getElementById("rMeta").textContent = "";
        document.getElementById("rDesc").textContent = "Log in to view the report details.";
        document.getElementById("rType").textContent = "-";
        document.getElementById("rSev").innerHTML = MW.severityBadge("medium");
        const locationSummary = document.getElementById("rLoc");
        if (locationSummary) {
            locationSummary.textContent = "-";
        }
        document.getElementById("rDate").textContent = "-";
        const esiField = document.getElementById("rEsi");
        if (esiField) {
            esiField.textContent = "-";
        }
        const coordBadge = document.getElementById("coord");
        if (coordBadge) {
            coordBadge.textContent = "Location unavailable";
        }
        const repName = document.getElementById("repName");
        if (repName) {
            repName.textContent = "Unknown reporter";
        }
        const repRole = document.getElementById("repRole");
        if (repRole) {
            repRole.textContent = "Log in to view";
        }
        const repAv = document.getElementById("repAv");
        if (repAv) {
            repAv.textContent = "NA";
        }
        return;
    }

    const coordinates = getMapCoordinates(report);
    const lat = coordinates?.lat ?? null;
    const lng = coordinates?.lng ?? null;

    const reportDate = getDisplayDate(report);
    const reportTitle = resolveReportValue(report, ["title"], "Untitled report");
    const reportDescription = getDisplayDescription(report);
    const reportType = resolveReportValue(report, ["type", "pollution_type"], "General");

    document.getElementById("rTitle").textContent = reportTitle;
    document.getElementById("rMeta").textContent = `${report.id ? report.id + ' · ' : ''}${reportDate}`;
    document.getElementById("rBadges").innerHTML =
        MW.severityBadge(report.severity || "medium") +
        " " +
        MW.statusBadge(report.status || "pending");
    document.getElementById("rDesc").textContent = reportDescription;
    document.getElementById("rType").textContent = reportType;
    document.getElementById("rSev").innerHTML = MW.severityBadge(report.severity || "medium");
    const esiField = document.getElementById("rEsi");
    if (esiField) {
        esiField.textContent = report.esi_score !== null && report.esi_score !== undefined
            ? `${report.esi_score} / 10`
            : "—";
    }
    const locationSummary = document.getElementById("rLoc");
    if (locationSummary) {
        locationSummary.textContent = getDisplayLocation(report, lat, lng);
    }
    document.getElementById("rDate").textContent = reportDate;

    const reporterObj = report.reporter || report.reporter_info || {};
    const reporterDisplay = resolveReportValue(reporterObj, ["full_name", "name", "display_name", "reporter"], "Unknown reporter");
    const reporterRoleText = reporterObj.certification_number ? "Certified diver" : (reporterObj.email ? "Verified reporter" : "Private reporter");
    const reporterAvatar = reporterDisplay
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join('') || 'NA';

    const repName = document.getElementById("repName");
    const repRole = document.getElementById("repRole");
    const repAv = document.getElementById("repAv");

    if (repName) {
        repName.textContent = reporterDisplay;
    }
    if (repRole) {
        repRole.textContent = reporterRoleText;
    }
    if (repAv) {
        repAv.textContent = reporterAvatar;
    }

    const coordBadge = document.getElementById("coord");

    if (coordBadge) {
        coordBadge.textContent = lat !== null && lng !== null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Location unavailable";
    }

    // Reverted gallery link changes; keep original image gallery behavior for report details
    const gallery = document.querySelector(".gallery");
    const previewOverlay = document.getElementById("imagePreviewOverlay");
    const previewImage = document.getElementById("imagePreviewImage");
    const previewClose = document.querySelector(".image-preview-close");
    const reportImages = getReportImages(images);

    if (gallery) {
        if (reportImages.length) {
            gallery.classList.remove("no-images");
            gallery.innerHTML = reportImages
                .slice(0, 4)
                .map((src, index) => {
                    const className = index === 0 ? 'g-main' : 'g-thumb';
                    return `<div class="${className}" data-src="${src}"><img src="${src}" alt="Report image"></div>`;
                })
                .join("");

            // handle click
            gallery.addEventListener('click', (event) => {
                const thumb = event.target.closest('.g-thumb, .g-main');
                if (!thumb || !previewOverlay || !previewImage) return;
                const src = thumb.dataset.src;
                if (!src) return;
                previewImage.src = src;
                previewOverlay.hidden = false;
            });
        } else {
            gallery.classList.add("no-images");
            gallery.innerHTML = "";
        }
    }

    if (previewClose) {
        // handle click
        previewClose.addEventListener('click', () => {
            if (previewOverlay) {
                previewOverlay.hidden = true;
            }
        });
    }

    if (previewOverlay) {
        // handle click
        previewOverlay.addEventListener('click', (event) => {
            if (event.target === previewOverlay) {
                previewOverlay.hidden = true;
            }
        });
    }

    const mapHost = document.getElementById("rMap");

    if (lat !== null && lng !== null && mapHost) {
        const map = L.map("rMap", {
            scrollWheelZoom: false,
            zoomControl: true
        });

        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            {
                attribution: "© OSM © CARTO"
            }
        ).addTo(map);

        map.setView([lat, lng], 11);
        L.marker([lat, lng])
            .addTo(map)
            .bindPopup(report.title || "Reported location")
            .openPopup();

        setTimeout(() => map.invalidateSize(), 180);
    } else if (mapHost) {
        mapHost.innerHTML = `
            <div class="map-empty-state">
                <i class="fa-solid fa-location-dot"></i>
                <span>Location unavailable</span>
            </div>
        `;
    }

});