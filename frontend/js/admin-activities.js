/* MarineWatch - Admin activities */

// runs once the page is ready
document.addEventListener('mw:ready', async () => {
  // read saved value
  const token = localStorage.getItem('mw_token');
  const activeRows = document.getElementById('activeRows');
  const endedRows = document.getElementById('endedRows');
  const q = document.getElementById('q');
  const createBtn = document.getElementById('createBtn');
  const activityTabs = Array.from(document.querySelectorAll('#activityTabs button'));
  const activeCountBadge = document.getElementById('activeCount');
  const endedCountBadge = document.getElementById('endedCount');
  const totalCountBadge = document.getElementById('totalCount');

  let activities = [];
  let approvedReports = [];
  let currentView = 'active';

  // escape html
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // get activity identity
  function getActivityIdentity(activity) {
    return [
      String(activity.title || ''),
      String(activity.location || activity.city || ''),
      String(activity.description || ''),
      String(activity.category || ''),
      String(activity.status || ''),
      String(activity.report_id || ''),
      String(activity.date || ''),
      String(activity.start_time || ''),
      String(activity.required_role || ''),
      String(activity.max_participants || '')
    ].join('|').toLowerCase();
  }

  // dedupe activities
  function dedupeActivities(list) {
    const seen = new Set();
    return list.filter((activity) => {
      const key = getActivityIdentity(activity);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // is ended activity
  function isEndedActivity(activity) {
    const status = (activity.status || '').toLowerCase();
    if (['closed', 'ended', 'completed'].includes(status)) return true;

    const dateValue = activity.date || activity.activity_date;
    if (!dateValue) return false;

    const activityDate = new Date(`${dateValue}`);
    if (Number.isNaN(activityDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate < today;
  }

  // update view state
  function updateViewState() {
    const sections = {
      active: document.querySelector('[data-section="active"]'),
      ended: document.querySelector('[data-section="ended"]')
    };

    activityTabs.forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === currentView);
    });

    if (sections.active) sections.active.hidden = currentView !== 'active' && currentView !== 'all';
    if (sections.ended) sections.ended.hidden = currentView !== 'ended' && currentView !== 'all';
  }

  // render activities
  function renderActivities() {
    if (!activeRows || !endedRows) return;
    const search = (q?.value || '').trim().toLowerCase();
    const visibleActivities = dedupeActivities(activities);
    // filtered
    const filtered = visibleActivities.filter((activity) => {
      const haystack = `${activity.title || ''} ${activity.location || ''} ${activity.description || ''}`.toLowerCase();
      return haystack.includes(search);
    });

    // active
    const active = filtered.filter((activity) => !isEndedActivity(activity));
    const ended = filtered.filter(isEndedActivity);

    if (!active.length) {
      activeRows.innerHTML = `<tr><td colspan="7"><div class="mw-empty"><i class="fa-solid fa-list-check"></i><div>No active activities found.</div></div></td></tr>`;
    } else {
      activeRows.innerHTML = active.map((activity) => renderActivityRow(activity)).join('');
    }

    if (!ended.length) {
      endedRows.innerHTML = `<tr><td colspan="7"><div class="mw-empty"><i class="fa-solid fa-check"></i><div>No ended activities yet.</div></div></td></tr>`;
    } else {
      endedRows.innerHTML = ended.map((activity) => renderActivityRow(activity)).join('');
    }

    if (activeCountBadge) activeCountBadge.textContent = String(active.length);
    if (endedCountBadge) endedCountBadge.textContent = String(ended.length);
    if (totalCountBadge) totalCountBadge.textContent = String(active.length + ended.length);

    updateViewState();
  }

  // render activity row
  function renderActivityRow(activity) {
    const participantCount = Number(activity.filled ?? activity.registered_users ?? activity.participant_count ?? 0);
    const reportLabel = activity.report_id ? `#${activity.report_id}` : '—';
    const severityLabel = MW.severityBadge((activity.severity || activity.report_severity || 'medium').toLowerCase());

    return `
      <tr>
        <td data-label="Title">${escapeHtml(activity.title || 'Untitled activity')}</td>
        <td data-label="Meeting point">${escapeHtml(activity.location || activity.city || 'Unknown')}</td>
        <td data-label="Severity">${severityLabel}</td>
        <td data-label="Time">${escapeHtml(activity.start_time || activity.activity_time || activity.time || 'TBD')}</td>
        <td data-label="Status">${escapeHtml(activity.status || 'open')}</td>
        <td data-label="Volunteers">
          <span class="me-2">${participantCount}</span>
          <button class="btn btn-sm btn-outline-secondary" data-action="view-volunteers" data-id="${activity.id}" data-title="${escapeHtml(activity.title || '')}">View</button>
        </td>
        <td data-label="Actions">
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${activity.id}">Delete</button>
        </td>
      </tr>
    `;
  }

  async function parseJsonResponse(response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      return { message: text || 'Unexpected server response.' };
    }
  }

  activityTabs.forEach((button) => {
    // handle click
    button.addEventListener('click', () => {
      currentView = button.dataset.tab || 'active';
      updateViewState();
    });
  });

  if (q) {
    // handle input
    q.addEventListener('input', renderActivities);
  }

  async function loadActivities() {
    if (!token) {
      mwToast('Admin session required.', 'error');
      return;
    }

    try {
      const [activitiesRes, reportsRes] = await Promise.all([
        // call the api
        fetch(window.apiUrl('/api/admin/activities'), { headers: { Authorization: `Bearer ${token}` } }),
        // call the api
        fetch(window.apiUrl('/api/admin/reports/approved'), { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const activitiesData = await parseJsonResponse(activitiesRes);
      const reportsData = await parseJsonResponse(reportsRes);

      if (!activitiesRes.ok) throw new Error(activitiesData.message || 'Could not load activities');
      if (!reportsRes.ok) throw new Error(reportsData.message || 'Could not load approved reports');

      activities = Array.isArray(activitiesData) ? activitiesData : [];
      approvedReports = Array.isArray(reportsData) ? reportsData : [];
      renderActivities();
    } catch (error) {
      console.error(error);
      mwToast(error.message || 'Could not load activities.', 'error');
    }
  }

  async function createActivity(payload, { onSuccess } = {}) {
    try {
      // call the api
      const response = await fetch(window.apiUrl('/api/admin/activities'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data.message || 'Could not create activity');
      await loadActivities();
      if (onSuccess) {
        onSuccess(data);
      } else {
        mwToast('Activity created successfully.', 'success');
      }
    } catch (error) {
      console.error(error);
      mwToast(error.message || 'Could not create activity.', 'error');
    }
  }

  // open create modal
  function openCreateModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(2,6,23,.6); display:flex; align-items:center; justify-content:center; z-index:3000; padding:16px;';

    const panel = document.createElement('div');
    panel.className = 'admin-create-modal-panel';
    panel.innerHTML = `
      <div class="admin-create-modal-head">
        <div>
          <h4>Create new activity</h4>
          <p>Add a new marine activity for divers and volunteers.</p>
        </div>
        <button type="button" id="closeCreateModal" class="btn btn-sm btn-outline-secondary">Close</button>
      </div>
      <form id="createActivityForm" class="admin-create-modal-form">
        <div id="createStatus" class="text-success small fw-semibold mb-3" hidden></div>
        <div class="mb-3">
          <label class="form-label">Title</label>
          <input required class="form-control" name="title" placeholder="Enter activity title">
        </div>
        <div class="mb-3">
          <label class="form-label">Description</label>
          <textarea class="form-control" name="description" rows="3" placeholder="Describe the activity"></textarea>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Meeting point</label>
            <input class="form-control" name="location" placeholder="e.g. Jeddah coast">
          </div>
          <div class="col-md-6">
            <label class="form-label">Category</label>
            <input class="form-control" name="category" placeholder="e.g. Cleanup">
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">Date</label>
            <input type="date" class="form-control" name="date">
          </div>
          <div class="col-md-4">
            <label class="form-label">Time</label>
            <input type="time" class="form-control" name="start_time">
          </div>
          <div class="col-md-4">
            <label class="form-label">Status</label>
            <select class="form-select" name="status">
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Latitude</label>
            <input type="number" step="0.0001" class="form-control" name="latitude" placeholder="21.4858">
          </div>
          <div class="col-md-6">
            <label class="form-label">Longitude</label>
            <input type="number" step="0.0001" class="form-control" name="longitude" placeholder="39.1925">
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Severity</label>
            <select class="form-select" name="severity">
              <option value="medium" selected>Medium (yellow)</option>
              <option value="critical">Critical (red)</option>
              <option value="high">High (orange)</option>
              <option value="low">Low (green)</option>
            </select>
            <div class="form-help">Choose a severity level for this activity so it is colored correctly on the diver and volunteer map.</div>
          </div>
        </div>
        <div class="admin-pin-map-card">
          <p class="map-help">Click or drag the pin on the map to set the meeting point for volunteers.</p>
          <div id="meetingPointMap" class="admin-pin-map"></div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Required role</label>
            <select class="form-select" name="required_role">
              <option value="both">Both</option>
              <option value="diver">Diver</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Max participants</label>
            <input type="number" class="form-control" name="max_participants" min="1" value="20">
          </div>
        </div>
        ${approvedReports.length ? `
          <div class="mb-4">
            <label class="form-label">Link to approved report (optional)</label>
            <select class="form-select" name="report_id">
              <option value="">None</option>
              ${approvedReports.map((report) => `<option value="${report.id}">${escapeHtml(report.title || `Report #${report.id}`)}</option>`).join('')}
            </select>
          </div>
        ` : ''}
        <div class="d-flex justify-content-end gap-2 mt-2">
          <button type="button" id="cancelCreateModal" class="btn btn-outline-secondary">Cancel</button>
          <button type="submit" class="btn btn-teal">Create activity</button>
        </div>
      </form>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    // close
    const close = () => modal.remove();

    // setup meeting point map
    const setupMeetingPointMap = () => {
      const latInput = panel.querySelector('input[name="latitude"]');
      const lngInput = panel.querySelector('input[name="longitude"]');
      const mapHost = panel.querySelector('#meetingPointMap');

      if (!mapHost || typeof L === 'undefined' || !latInput || !lngInput) return;

      const defaultLat = Number(latInput.value || 21.4858);
      const defaultLng = Number(lngInput.value || 39.1925);
      const initialLat = Number.isFinite(defaultLat) ? defaultLat : 21.4858;
      const initialLng = Number.isFinite(defaultLng) ? defaultLng : 39.1925;

      const map = L.map(mapHost, { zoomControl: true, scrollWheelZoom: true }).setView([initialLat, initialLng], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // update inputs
      const updateInputs = (latlng) => {
        const lat = Number(latlng.lat).toFixed(4);
        const lng = Number(latlng.lng).toFixed(4);
        latInput.value = lat;
        lngInput.value = lng;
      };

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      marker.on('dragend', () => updateInputs(marker.getLatLng()));
      map.on('click', (event) => {
        marker.setLatLng(event.latlng);
        updateInputs(event.latlng);
      });

      [latInput, lngInput].forEach((input) => {
        // handle change
        input.addEventListener('change', () => {
          const lat = Number(latInput.value);
          const lng = Number(lngInput.value);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            marker.setLatLng([lat, lng]);
            map.setView([lat, lng], Math.max(map.getZoom(), 10));
          }
        });
      });
    };

    setTimeout(setupMeetingPointMap, 0);
    // handle click
    panel.querySelector('#closeCreateModal').addEventListener('click', close);
    // handle click
    panel.querySelector('#cancelCreateModal').addEventListener('click', close);
    // handle click
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });

    const form = panel.querySelector('#createActivityForm');
    const statusEl = panel.querySelector('#createStatus');

    // handle form submit
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const payload = {
        title: formData.get('title')?.toString().trim(),
        description: formData.get('description')?.toString().trim() || 'No description provided.',
        location: formData.get('location')?.toString().trim() || 'Unknown',
        category: formData.get('category')?.toString().trim() || 'General',
        date: formData.get('date')?.toString() || null,
        start_time: formData.get('start_time')?.toString() || null,
        latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
        longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
        severity: formData.get('severity')?.toString() || null,
        status: formData.get('status')?.toString() || 'open',
        required_role: formData.get('required_role')?.toString() || 'both',
        max_participants: Number(formData.get('max_participants') || 20),
        report_id: formData.get('report_id') ? Number(formData.get('report_id')) : null
      };

      if (!payload.title) {
        mwToast('Activity title is required.', 'error');
        return;
      }

      statusEl.hidden = true;
      statusEl.textContent = '';

      await createActivity(payload, {
        onSuccess: () => {
          statusEl.hidden = false;
          statusEl.textContent = 'Activity created successfully.';
          form.reset();
          panel.querySelector('input[name="title"]').focus();
          setTimeout(() => close(), 900);
        }
      });
    });
  }

  async function deleteActivity(id) {
    try {
      // call the api
      const response = await fetch(window.apiUrl(`/api/admin/activities/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not delete activity');
      mwToast('Activity deleted.', 'success');
      await loadActivities();
    } catch (error) {
      console.error(error);
      mwToast(error.message || 'Could not delete activity.', 'error');
    }
  }

  async function loadParticipants(activityId) {
    if (!token) {
      mwToast('Admin session required.', 'error');
      return [];
    }

    try {
      // call the api
      const response = await fetch(window.apiUrl(`/api/admin/activities/${encodeURIComponent(activityId)}/participants`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load participants');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(error);
      mwToast(error.message || 'Could not load participants.', 'error');
      return [];
    }
  }

  // open participants modal
  function openParticipantsModal(activityTitle, participants) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(2,6,23,.6); display:flex; align-items:center; justify-content:center; z-index:3000; padding:16px;';

    const panel = document.createElement('div');
    panel.className = 'admin-create-modal-panel';
    panel.style.maxWidth = '720px';
    panel.innerHTML = `
      <div class="admin-create-modal-head">
        <div>
          <h4>Participants for ${escapeHtml(activityTitle)}</h4>
          <p class="text-muted">${participants.length} participant${participants.length === 1 ? '' : 's'} registered.</p>
        </div>
        <button type="button" id="closeParticipantsModal" class="btn btn-sm btn-outline-secondary">Close</button>
      </div>
      <div class="admin-participants-list">
        ${participants.length ? `
          <div class="table-responsive">
            <table class="mw-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined at</th><th>Status</th></tr></thead>
              <tbody>
                ${participants.map((participant) => {
                  const normalizedRole = String(participant.role || '')
                    .trim()
                    .toLowerCase();
                  const displayRole = normalizedRole === 'diver' ? 'Diver' : normalizedRole === 'volunteer' ? 'Volunteer' : 'Participant';
                  const joinedDate = participant.joined_at ? new Date(participant.joined_at).toISOString().split('T')[0] : 'n/a';
                  return `
                    <tr>
                      <td data-label="Name">${escapeHtml(participant.name || `User #${participant.id}`)}</td>
                      <td data-label="Email">${escapeHtml(participant.email || 'n/a')}</td>
                      <td data-label="Role">${escapeHtml(displayRole)}</td>
                      <td data-label="Joined">${escapeHtml(joinedDate)}</td>
                      <td data-label="Status">${escapeHtml(participant.status || 'joined')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="mw-empty"><i class="fa-solid fa-user-friends"></i><div>No participants registered yet.</div></div>`}
      </div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    // close
    const close = () => modal.remove();
    // handle click
    panel.querySelector('#closeParticipantsModal')?.addEventListener('click', close);
    // handle click
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
  }

  // table click handler
  const tableClickHandler = async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');
    const title = button.getAttribute('data-title') || 'Activity';

    if (action === 'delete') {
      await deleteActivity(id);
      return;
    }

    if (action === 'view-volunteers') {
      const participants = await loadParticipants(id);
      openParticipantsModal(title, participants);
      return;
    }
  };

  // handle click
  activeRows?.addEventListener('click', tableClickHandler);
  // handle click
  endedRows?.addEventListener('click', tableClickHandler);

  // handle click
  createBtn?.addEventListener('click', () => {
    openCreateModal();
  });

  // handle input
  q?.addEventListener('input', renderActivities);
  await loadActivities();
});