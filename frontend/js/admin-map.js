/* ==========================================================
   MarineWatch
   Admin Map
========================================================= */

// runs once the page is ready
document.addEventListener('mw:ready', () => {
  // read saved value
  const user = JSON.parse(localStorage.getItem('mw_user')) || {};
  // read saved value
  const token = localStorage.getItem('mw_token');
  let reports = [];

  const actionBox = document.getElementById('mapActions');
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let severityFilter = 'all';
  let markers = [];

  // update action button
  function updateActionButton() {
    if (!actionBox) return;
    actionBox.innerHTML = '<a href="review-reports.html" class="btn btn-primary"><i class="fa-solid fa-list-check me-2"></i>Review Reports</a>';
  }

  // get severity color
  function getSeverityColor(severity) {
    switch ((severity || '').toLowerCase()) {
      case 'critical': return '#C62828';
      case 'high': return '#F57C00';
      case 'medium': return '#FBC02D';
      case 'low': return '#2E7D32';
      default: return '#2E7D32';
    }
  }

  // get pollution icon
  function getPollutionIcon(type) {
    switch ((type || '').toLowerCase()) {
      case 'plastic': return 'fa-bottle-water';
      case 'oil': return 'fa-oil-can';
      case 'chemical': return 'fa-flask';
      case 'fishing gear': return 'fa-fish';
      case 'debris': return 'fa-trash';
      case 'coral bleaching': return 'fa-leaf';
      case 'sewage': return 'fa-water';
      default: return 'fa-location-dot';
    }
  }

  // escape html
  function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // get map position
  function getMapPosition(report) {
    const lat = Number(report.latitude || report.lat || report.latitude_raw || report.lat_raw);
    const lng = Number(report.longitude || report.lng || report.longitude_raw || report.lng_raw);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }

  // create marker icon
  function createMarkerIcon(report) {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-circle" style="background:${getSeverityColor(report.severity)};"><i class="fa-solid ${getPollutionIcon(report.type)}"></i></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  async function loadReports() {
    if (!token) {
      mwToast('Admin session expired. Please log in again.', 'error');
      return;
    }

    try {
      // call the api
      const response = await fetch(window.apiUrl('/api/reports'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Could not load reports.');
      }
      reports = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(error);
      reports = [];
      mwToast(error.message || 'Could not load reports.', 'error');
    }
  }

  // show empty state
  function showEmptyState() {
    mwToast('No pending reports found for review.', 'warn');
  }

  const map = L.map('marineMap', { zoomControl: true }).setView([23.8859, 45.0792], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);

  // render reports
  function renderReports() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const search = (searchInput.value || '').trim().toLowerCase();
    const selectedType = (typeFilter.value || '').trim().toLowerCase();

    // filtered reports
    const filteredReports = reports.filter(report => {
      if (!report) return false;

      const status = (report.status || '').toLowerCase();
      if (status !== 'pending') return false;

      if (severityFilter !== 'all' && (report.severity || '').toLowerCase() !== severityFilter) return false;
      if (selectedType && (report.type || '').toLowerCase() !== selectedType) return false;
      if (search) {
        const haystack = `${report.title || ''} ${report.location || ''} ${report.type || ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return getMapPosition(report) !== null;
    });

    if (filteredReports.length === 0) {
      showEmptyState();
      return;
    }

    const bounds = [];
    filteredReports.forEach(report => {
      const position = getMapPosition(report);
      if (!position) return;
      const marker = L.marker([position.lat, position.lng], { icon: createMarkerIcon(report) });
      marker.bindPopup(`
        <strong>${escapeHtml(report.title || 'Untitled report')}</strong><br>
        ${escapeHtml(report.type || 'Unknown')}<br>
        Severity: ${escapeHtml(report.severity || 'low')}<br>
        Status: ${escapeHtml(report.status || 'pending')}
      `);
      marker.on('click', () => {
        window.location.href = `report-review.html?id=${encodeURIComponent(report.id)}`;
      });
      marker.addTo(map);
      markers.push(marker);
      bounds.push([position.lat, position.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 9);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });
    }
  }

  updateActionButton();

  // handle input
  if (searchInput) searchInput.addEventListener('input', renderReports);
  // handle change
  if (typeFilter) typeFilter.addEventListener('change', renderReports);
  filterButtons.forEach(button => {
    // handle click
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      severityFilter = button.dataset.filter || 'all';
      renderReports();
    });
  });

  (async function init() {
    await loadReports();
    renderReports();
  })();
});
