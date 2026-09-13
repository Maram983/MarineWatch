/* ==========================================================
   MarineWatch
   Marine Map
========================================================= */

// runs once the page is ready
document.addEventListener('mw:ready', () => {
  // read saved value
  const user = JSON.parse(localStorage.getItem('mw_user')) || {};
  const canOpenDetails = user.role === 'admin' || user.role === 'diver';
  let reports = [];

  const actionBox = document.getElementById('mapActions');
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let severityFilter = 'all';
  let markers = [];

  // Volunteers/general users get a region-level heatmap (no individual
  // report identity) instead of clickable pins — search-by-title and
  // type filtering don't apply to that view, so hide them.
  if (!canOpenDetails) {
    const searchWrap = searchInput?.closest('.mb-3, .search-wrap') || searchInput;
    if (searchWrap) searchWrap.style.display = 'none';
    if (typeFilter) typeFilter.style.display = 'none';
  }

  // update action button
  function updateActionButton() {
    if (!actionBox) return;
    switch (user.role) {
      case 'diver':
        actionBox.innerHTML = `<a href="${window.mwNav?.resolveHref('submit-report.html') || 'submit-report.html'}" class="btn btn-primary"><i class="fa-solid fa-plus me-2"></i>Submit Report</a>`;
        break;
      case 'volunteer':
        actionBox.innerHTML = `<a href="${window.mwNav?.resolveHref('activities.html') || 'activities.html'}" class="btn btn-success"><i class="fa-solid fa-hands-helping me-2"></i>Join Activity</a>`;
        break;
      case 'admin':
        actionBox.innerHTML = '<a href="review-reports.html" class="btn btn-primary"><i class="fa-solid fa-list-check me-2"></i>Review Reports</a>';
        break;
      default:
        actionBox.innerHTML = '';
    }
  }

  // get severity color
  function getSeverityColor(severity) {
    switch ((severity || '').toLowerCase()) {
      case 'high': return '#F57C00';
      case 'medium': return '#FBC02D';
      case 'low': return '#2E7D32';
      default: return '#2E7D32';
    }
  }

  // get marker icon
  function getMarkerIcon(type, isActivity) {
    if (isActivity) {
      return 'fa-calendar-check';
    }

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
    const isActivity = Boolean(report.isActivity);
    let color;
    if (isActivity) {
      color = report.severity ? getSeverityColor(report.severity) : '#0EA5E9';
    } else {
      color = getSeverityColor(report.severity);
    }
    return L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-circle" style="background:${color};"><i class="fa-solid ${getMarkerIcon(report.type, isActivity)}"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  async function loadReports() {
    try {
      const endpoint = window.apiUrl('/api/reports/map');
      // call the api
      const response = await fetch(endpoint);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Could not load map data.');
      }
      reports = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(error);
      reports = [];
      mwToast(error.message || 'Could not load map data.', 'error');
    }
  }

  // show empty state
  function showEmptyState() {
    mwToast('No reports found with the selected filters.', 'warn');
  }

  const map = L.map('marineMap', { zoomControl: true }).setView([23.8859, 45.0792], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);

  // Groups nearby markers into a numbered cluster bubble so overlapping
  // pins (e.g. several reports in the same city) don't stack on top of
  // each other — expands automatically on zoom or click. Only used in
  // the admin/diver pin view.
  const markerCluster = canOpenDetails ? L.markerClusterGroup({ maxClusterRadius: 50 }) : null;
  if (markerCluster) map.addLayer(markerCluster);

  /* ----------------------------------------------------------
     Region-level heatmap (volunteers / general users)
     No individual report identity is shown — just how many
     approved reports, and how severe, cluster near each coastal
     region. Same regions/approach as the public homepage widget.
  ---------------------------------------------------------- */
  const REGIONS = [
    { name: 'Jeddah', lat: 21.5433, lng: 39.1728 },
    { name: 'Rabigh', lat: 22.7986, lng: 39.0333 },
    { name: 'Yanbu', lat: 24.0895, lng: 38.0618 },
    { name: 'Umm Lujj', lat: 25.0159, lng: 37.2679 },
    { name: 'Al Wajh', lat: 26.2360, lng: 36.4429 },
    { name: 'Duba', lat: 27.3517, lng: 35.6892 },
    { name: 'Haql', lat: 29.2874, lng: 34.9354 },
    { name: 'Al Lith', lat: 20.1478, lng: 40.2698 },
    { name: 'Jazan', lat: 16.8892, lng: 42.5511 },
    { name: 'Farasan Islands', lat: 16.7047, lng: 42.1264 },
    { name: 'Dammam', lat: 26.4207, lng: 50.0888 },
    { name: 'Al Khobar', lat: 26.2172, lng: 50.1971 },
    { name: 'Jubail', lat: 27.0046, lng: 49.6600 },
    { name: 'Ras Tanura', lat: 26.6444, lng: 50.1590 },
    { name: 'Qatif', lat: 26.5205, lng: 50.0089 }
  ];

  const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };

  const HEAT_LEVELS = [
    { max: 0, label: 'No Reports', color: '#B0BEC5' },
    { max: 2, label: 'Low', color: '#2E7D32' },
    { max: 5, label: 'Moderate', color: '#FBC02D' },
    { max: Infinity, label: 'High', color: '#F57C00' }
  ];

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

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

  function levelFor(score) {
    return HEAT_LEVELS.find((tier) => score <= tier.max);
  }

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

  let heatLayer = L.layerGroup().addTo(map);

  function renderHeatmap() {
    heatLayer.clearLayers();

    const filteredReports = reports.filter(report => {
      if (!report || report.isActivity) return false;
      if (severityFilter !== 'all' && (report.severity || '').toLowerCase() !== severityFilter) return false;
      return getMapPosition(report) !== null;
    });

    if (filteredReports.length === 0) {
      showEmptyState();
    }

    const stats = new Map(REGIONS.map((r) => [r.name, { region: r, count: 0, score: 0 }]));

    filteredReports.forEach((report) => {
      const point = getMapPosition(report);
      if (!point) return;
      const region = nearestRegion(point);
      if (!region) return;

      const severity = (report.severity || 'low').toLowerCase();
      const entry = stats.get(region.name);
      entry.count += 1;
      entry.score += SEVERITY_WEIGHT[severity] || 1;
    });

    stats.forEach((entry) => {
      const level = levelFor(entry.score);
      const tooltipHtml =
        `<strong>${escapeHtml(entry.region.name)}</strong><br>` +
        `${entry.count} approved ${entry.count === 1 ? 'report' : 'reports'}<br>` +
        `Pollution level: ${escapeHtml(level.label)}`;

      if (entry.count > 0) {
        L.marker([entry.region.lat, entry.region.lng], {
          icon: glowIcon(level.color),
          interactive: false,
          keyboard: false
        }).addTo(heatLayer);
      }

      L.circleMarker([entry.region.lat, entry.region.lng], {
        radius: entry.count > 0 ? 7 : 6,
        stroke: true,
        color: entry.count > 0 ? level.color : '#B0BEC5',
        weight: 2,
        fillColor: entry.count > 0 ? level.color : '#B0BEC5',
        fillOpacity: entry.count > 0 ? 0.9 : 0.5
      })
        .bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -4] })
        .addTo(heatLayer);
    });
  }

  // Add map legend to explain marker/heatmap colors
  function addMapLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-legend');
      const items = canOpenDetails
        ? [
            { color: getSeverityColor('high'), label: 'High' },
            { color: getSeverityColor('medium'), label: 'Medium' },
            { color: getSeverityColor('low'), label: 'Low' }
          ]
        : HEAT_LEVELS.map(l => ({ color: l.color, label: l.label }));

      let html = '<div class="legend-title">Legend</div>';
      items.forEach(it => {
        html += `<div class="legend-row"><span class="legend-dot" style="background:${it.color}"></span><span class="legend-label">${it.label}</span></div>`;
      });

      div.innerHTML = html;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };
    legend.addTo(map);
  }

  addMapLegend();

  // render reports (pin view — admin/diver only)
  function renderReports() {
    markerCluster.clearLayers();
    markers = [];

    const search = (searchInput?.value || '').trim().toLowerCase();
    const selectedType = (typeFilter?.value || '').trim().toLowerCase();

    // filtered reports
    const filteredReports = reports.filter(report => {
      if (!report) return false;
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
      const marker = L.marker([position.lat, position.lng], {
        icon: createMarkerIcon(report)
      });
      const formattedDate = MW.formatDateString(report.observed_date || report.created_at || report.date || report.createdAt || 'Unknown') || 'Unknown';
      const locationLabel = report.location || (position ? `${position.lat.toFixed(3)}, ${position.lng.toFixed(3)}` : 'Unknown location');
      const popupHtml = `
        <strong>${escapeHtml(report.title || 'Untitled report')}</strong><br>
        ${escapeHtml(locationLabel)}<br>
        ${escapeHtml(report.type || 'Unknown')}<br>
        Severity: ${escapeHtml(report.severity || 'low')}${report.esi_score !== null && report.esi_score !== undefined ? ` (ESI ${escapeHtml(String(report.esi_score))}/10)` : ''}<br>
        Submitted: ${escapeHtml(formattedDate)}${report.related_activity?.title ? `<br>Related activity: ${escapeHtml(report.related_activity.title)}` : ''}
      `;

      marker.bindPopup(popupHtml);
      // Admins can open any report/activity's detail page. Divers only
      // own their own reports, so a pin belonging to someone else would
      // land on a blank details page — for divers, tapping a pin just
      // shows the popup above instead of navigating.
      if (user.role === 'admin') {
        marker.on('click', () => {
          if (report.isActivity) {
            window.location.href = `activity-details.html?id=${encodeURIComponent(report.id)}`;
          } else {
            window.location.href = `report-details.html?id=${encodeURIComponent(report.id)}`;
          }
        });
      }
      markerCluster.addLayer(marker);
      markers.push(marker);
      bounds.push([position.lat, position.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 9);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });
    }
  }

  function render() {
    if (canOpenDetails) {
      renderReports();
    } else {
      renderHeatmap();
    }
  }

  // handle input
  if (searchInput) searchInput.addEventListener('input', render);
  // handle change
  if (typeFilter) typeFilter.addEventListener('change', render);
  filterButtons.forEach(button => {
    // handle click
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      severityFilter = button.dataset.filter || 'all';
      render();
    });
  });

  updateActionButton();

  (async function init() {
    await loadReports();
    render();
  })();
});
