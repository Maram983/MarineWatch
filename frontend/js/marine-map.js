/* ==========================================================
   MarineWatch - Map (rewritten)
   Organized, modular code. Keeps UI intact; improves behavior.
========================================================== */

/* Helper: safe JSON parse */
const _parseJSON = (v, fallback = null) => {
  try { return JSON.parse(v); } catch (e) { return fallback; }
};

// runs once the page is ready
document.addEventListener("mw:ready", () => {
  // read saved value
  const mw_user = _parseJSON(localStorage.getItem("mw_user"), {}) || {};
  // Elements (IDs come from frontend/html/map.html)
  const actionBox = document.getElementById("mapActions");
  const searchInput = document.getElementById("mmSearch");
  const typeSelect = document.getElementById("mmType");
  const sevContainer = document.getElementById("mmSev");
  const countEl = document.getElementById("mmCount");
  const detailsEl = document.getElementById("mmDetails");
  const mapHostId = "leaflet-map";

  // State
  let map = null;
  let allReports = [];
  let visibleReports = [];
  let markers = [];
  let currentSelection = null;
  let activeSeverity = "all";
  let activeType = "all";
  let searchTerm = "";

  // Icon mapping (Font Awesome classes)
  const typeIcon = {
    "plastic": "fa-bottle-water",
    "oil": "fa-oil-can",
    "chemical": "fa-flask",
    "fishing gear": "fa-fish",
    "fishing": "fa-fish",
    "debris": "fa-trash",
    "bleaching": "fa-leaf",
    "coral bleaching": "fa-leaf",
    "sewage": "fa-water"
  };

  const severityClasses = {
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low"
  };

  // No demo reports — load approved reports from backend only.

  // Create the Leaflet map
  function createMap() {
    map = L.map(mapHostId, { zoomControl: true }).setView([23.8, 41.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
  }

  // Load approved reports from the backend API only. No demo/localStorage fallbacks.
  async function loadReports() {
    try {
      // call the api
      const res = await fetch(window.apiUrl('/api/reports/map'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load map reports');
      allReports = Array.isArray(data) ? data : data.reports || [];

      // Normalize fields (helpful when data varies)
      allReports = allReports.map(r => ({
        id: r.id,
        title: r.title || r.name || 'Untitled',
        type: r.type || r.pollution_type || 'Unknown',
        severity: (r.severity || r.risk || 'low').toString().toLowerCase(),
        description: r.description || r.note || '',
        date: MW.formatDateString(r.observed_date || r.created_at || r.date || ''),
        location: r.location || r.place || '',
        lat: Number(r.lat ?? r.latitude ?? r.lat_value ?? 0),
        lng: Number(r.lng ?? r.longitude ?? r.lng_value ?? 0),
        status: r.status || 'pending'
      }));

      applyFilters();
    } catch (err) {
      console.error('Unable to load map reports:', err);
      const mapHost = document.getElementById(mapHostId);
      if (mapHost) mapHost.innerHTML = `<div class="mw-empty"><i class="fa-solid fa-triangle-exclamation"></i><div>Unable to load map data. Please try again.</div></div>`;
    }
  }

  // Create a marker for a report
  function createMarker(report) {
    const sev = (report.severity || "low").toLowerCase();
    const sevClass = severityClasses[sev] || "low";

    const iconKey = (report.type || "").toString().toLowerCase();
    const fa = typeIcon[iconKey] || typeIcon[iconKey.split(' ')[0]] || "fa-map-marker-alt";

    const html = `<div class="mm-marker ${sevClass}"><i class="fa-solid ${fa}"></i></div>`;

    const icon = L.divIcon({ html, className: '', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18] });

    const m = L.marker([report.lat, report.lng], { icon });

    const popupHtml = `
      <div class="popup-inner">
        <div class="popup-title">${escapeHtml(report.title)}</div>
        <div class="popup-meta">${escapeHtml(report.location)} &middot; ${escapeHtml(capitalize(report.type))}</div>
        <div class="popup-meta">Severity: ${capitalize(report.severity)} &middot; ${escapeHtml(MW.formatDateString(report.date) || report.date || 'Unknown')}</div>
        <div class="popup-meta">Status: ${escapeHtml(report.status || 'Approved')}</div>
        ${report.related_activity?.title ? `<div class="popup-meta">Related activity: ${escapeHtml(report.related_activity.title)}</div>` : ''}
      </div>
    `;

    m.bindPopup(popupHtml);

    m.on('click', () => {
      // Open popup (Leaflet does this automatically), update details and zoom
      updateDetails(report);
      try { map.flyTo([report.lat, report.lng], Math.max(map.getZoom(), 12), { duration: 0.7 }); } catch (e) {}
    });

    return m;
  }

  // Render markers for visibleReports
  function renderMarkers() {
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    visibleReports.forEach(r => {
      if (!r.lat || !r.lng) return;
      const m = createMarker(r);
      m.addTo(map);
      markers.push(m);
    });

    // Update count
    countEl.textContent = visibleReports.length;
  }

  // Apply current filters (severity, type, search)
  function applyFilters() {
    const s = (activeSeverity || 'all').toString().toLowerCase();
    const t = (activeType || 'all').toString().toLowerCase();
    const q = (searchTerm || '').toString().trim().toLowerCase();

    visibleReports = allReports.filter(r => {
      // Admin sees everything; others only approved
      if (mw_user.role !== 'admin' && (!r.status || r.status.toLowerCase() !== 'approved')) return false;

      if (s !== 'all' && (r.severity || '').toLowerCase() !== s) return false;

      if (t !== 'all') {
        // Map select values: "fishing gear" vs "Fishing Gear" – compare lowercased tokens
        if ((r.type || '').toString().toLowerCase() !== t) return false;
      }

      if (q) {
        const hay = [r.title, r.location, r.type].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    renderMarkers();
  }

  // Update details panel with report info
  function updateDetails(report) {
    currentSelection = report;

    const isAdmin = mw_user.role === 'admin';

    const html = `
      <div class="mm-det-head">
        <div>
          <h3 class="mm-det-title">${escapeHtml(report.title)}</h3>
          <div class="mm-det-id">${escapeHtml(report.location)}</div>
        </div>
        <div class="mm-det-badges">
          <span class="badge bg-light text-dark">${escapeHtml(capitalize(report.type))}</span>
        </div>
      </div>

      <div class="mm-det-grid">
        <div class="cell"><div class="k">Severity</div><div class="v">${escapeHtml(capitalize(report.severity))}</div></div>
        <div class="cell"><div class="k">Date</div><div class="v">${escapeHtml(MW.formatDateString(report.date) || report.date || 'Unknown')}</div></div>
        <div class="cell"><div class="k">Status</div><div class="v">${escapeHtml(report.status || 'Approved')}</div></div>
        <div class="cell"><div class="k">Location</div><div class="v">${escapeHtml(report.location)}</div></div>
        <div class="cell"><div class="k">Category</div><div class="v">${escapeHtml(capitalize(report.type))}</div></div>
        ${report.related_activity?.title ? `<div class="cell"><div class="k">Related Activity</div><div class="v">${escapeHtml(report.related_activity.title)}</div></div>` : ''}
      </div>

      <div class="mm-det-desc">${escapeHtml(report.description || '')}</div>

      <div class="mm-det-actions">
        ${isAdmin ? `<a href="review-reports.html?id=${encodeURIComponent(report.id)}" class="btn btn-primary">Review Report</a>` : `<a href="report-details.html?id=${encodeURIComponent(report.id)}" class="btn btn-outline-primary">View Report</a>`}
      </div>
    `;

    detailsEl.innerHTML = html;
  }

  // Utility: escape HTML
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // capitalize
  function capitalize(s) {
    if (!s) return '';
    s = String(s);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Wire UI controls
  function bindControls() {
    // Top action button
    if (actionBox) {
      switch (mw_user.role) {
        case 'diver':
          actionBox.innerHTML = `<a href="${window.mwNav?.resolveHref('submit-report.html') || 'submit-report.html'}" class="btn btn-primary"><i class="fa-solid fa-plus me-2"></i>Submit Report</a>`;
          break;
        case 'volunteer':
          actionBox.innerHTML = `<a href="${window.mwNav?.resolveHref('activities.html') || 'activities.html'}" class="btn btn-success"><i class="fa-solid fa-hands-helping me-2"></i>Join Activity</a>`;
          break;
        default:
          actionBox.innerHTML = `<a href="review-reports.html" class="btn btn-primary"><i class="fa-solid fa-list-check me-2"></i>Review Reports</a>`;
      }
    }

    // Severity buttons (delegation)
    if (sevContainer) {
      // handle click
      sevContainer.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.mm-sev-btn');
        if (!btn) return;
        // Toggle active class
        Array.from(sevContainer.querySelectorAll('.mm-sev-btn')).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSeverity = btn.getAttribute('data-sev') || 'all';
        applyFilters();
      });
    }

    if (typeSelect) {
      // handle change
      typeSelect.addEventListener('change', (e) => {
        activeType = (e.target.value || 'all').toString().toLowerCase();
        applyFilters();
      });
    }

    if (searchInput) {
      // handle input
      searchInput.addEventListener('input', (e) => {
        searchTerm = (e.target.value || '');
        applyFilters();
      });
    }
  }

  // Initialize map UI
  function init() {
    createMap();
    bindControls();
    loadReports();

    // Fit bounds if there are markers
    setTimeout(() => {
      if (markers.length === 0 && visibleReports.length > 0) {
        renderMarkers();
      }
      // coords
      const coords = visibleReports.filter(r => r.lat && r.lng).map(r => [r.lat, r.lng]);
      if (coords.length === 1) {
        map.setView(coords[0], 11);
      } else if (coords.length > 1) {
        try { map.fitBounds(coords, { maxZoom: 11, padding: [40, 40] }); } catch (e) {}
      }
    }, 250);
  }

  init();
});
