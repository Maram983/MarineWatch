/* MarineWatch - Activities */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    // read saved value
    const token = localStorage.getItem("mw_token");

    // decode jwt role
    function decodeJwtRole() {
        try {
            // read saved value
            const jwt = localStorage.getItem("mw_token") || "";
            const payload = jwt.split(".")[1];
            if (!payload) return "";
            const normalized = JSON.parse(atob(payload)).role || "";
            return String(normalized).trim().toLowerCase();
        } catch (error) {
            return "";
        }
    }

    // get current role
    function getCurrentRole() {
        // read saved value
        const user = JSON.parse(localStorage.getItem("mw_user") || "{}") || {};
        const storedRole = String(user.role || "").trim().toLowerCase();
        return storedRole || decodeJwtRole();
    }

    const currentRole = getCurrentRole();

    let activities = [];
    let joinedIds = new Set();
    let refreshTimer = null;

    const grid = document.getElementById("grid");
    const searchInput = document.getElementById("q");
    const cityFilter = document.getElementById("fCity");
    const typeFilter = document.getElementById("fType");
    const statusFilter = document.getElementById("fStatus");

    // get status badge
    function getStatusBadge(status) {
        switch ((status || "").toLowerCase()) {
            case "open": return '<span class="mw-badge mw-badge-green">Open</span>';
            case "filling": return '<span class="mw-badge mw-badge-amber">Filling fast</span>';
            case "closed": return '<span class="mw-badge mw-badge-gray">Closed</span>';
            default: return '<span class="mw-badge mw-badge-gray">Unknown</span>';
        }
    }

    // normalize activity
    function normalizeActivity(activity) {
        const slots = Number(activity.slots || activity.available_slots || 0);
        const filled = Number(activity.filled || activity.registered || activity.registered_users || 0);
        const availableSpots = Number(activity.available_spots ?? Math.max(0, slots - filled));

        return {
            id: String(activity.id || activity.activity_id || ""),
            title: activity.title || "Untitled activity",
            type: activity.type || activity.activity_type || "General",
            city: activity.city || activity.location || activity.meeting_point || "Unknown",
            location: activity.location || activity.city || activity.meeting_point || "Unknown",
            date: MW.formatDateString(activity.activity_date || activity.date || "TBD"),
            time: activity.start_time || activity.activity_time || activity.time || "TBD",
            slots,
            filled,
            availableSpots,
            status: (activity.status || "open").toLowerCase(),
            desc: activity.description || activity.desc || "No description available.",
            lat: Number(activity.latitude || activity.lat || 0),
            lng: Number(activity.longitude || activity.lng || 0),
            approvalSource: activity.approval_source || activity.approvalSource || null,
            reportTitle: activity.report_title || activity.reportTitle || null
        };
    }

    async function fetchActivities() {
        try {
            // call the api
            const response = await fetch(window.apiUrl("/api/activities"));
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not load activities.");
            activities = Array.isArray(data) ? data.map(normalizeActivity) : [];
        } catch (error) {
            console.error(error);
            activities = [];
            if (grid) {
                grid.innerHTML = `\n                    <div class="mw-empty" style="grid-column:1/-1">\n                        <i class="fa-solid fa-inbox"></i>\n                        <h4>Unable to load activities</h4>\n                        <p>${error.message || "Please try again later."}</p>\n                    </div>\n                `;
            }
        }
    }

    async function fetchJoinedActivities() {
        if (!token) {
            joinedIds = new Set();
            return;
        }

        try {
            // call the api
            const response = await fetch(window.apiUrl("/api/activities/joined"), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not load joined activities.");
            joinedIds = new Set(Array.isArray(data) ? data.map((activity) => String(activity.id || activity.activity_id || activity.id)) : []);
        } catch (error) {
            console.error(error);
            joinedIds = new Set();
        }
    }

    // render activities
    function renderActivities() {
        if (!grid) return;

        const query = (searchInput?.value || "").toLowerCase().trim();
        const selectedCity = (cityFilter?.value || "").trim();
        const selectedType = (typeFilter?.value || "").trim();
        const selectedStatus = (statusFilter?.value || "").trim();

        // filtered
        const filtered = activities.filter((activity) => {
            const matchesSearch = !query || `${activity.title} ${activity.city} ${activity.type}`.toLowerCase().includes(query);
            const matchesCity = !selectedCity || activity.city === selectedCity;
            const matchesType = !selectedType || activity.type === selectedType;
            const matchesStatus = !selectedStatus || activity.status === selectedStatus;
            return matchesSearch && matchesCity && matchesType && matchesStatus;
        });

        if (!filtered.length) {
            grid.innerHTML = `\n                <div class="mw-empty" style="grid-column:1/-1">\n                    <i class="fa-solid fa-inbox"></i>\n                    <h4>No activities found</h4>\n                    <p>Try changing your filters.</p>\n                </div>\n            `;
            return;
        }

        grid.innerHTML = filtered.map((activity) => {
            const progress = activity.slots > 0 ? Math.round((activity.filled / activity.slots) * 100) : 0;
            const alreadyJoined = joinedIds.has(activity.id);
            const availableSpots = Math.max(0, activity.availableSpots ?? Math.max(0, activity.slots - activity.filled));
            const isFull = availableSpots <= 0;
            const isAllowedRole = Boolean(token && ["diver", "volunteer"].includes(currentRole));
            const canJoin = isAllowedRole && !alreadyJoined && !isFull && activity.status !== "closed";
            const buttonLabel = alreadyJoined ? "Joined" : isFull ? "Full" : "Join";

            return `
                <div class="activity-card">
                    <div class="a-image">
                        <div class="status-chip">${getStatusBadge(activity.status)}</div>
                        <div class="date-chip"><i class="fa-regular fa-calendar me-1"></i>${activity.date}</div>
                    </div>
                    <div class="a-body">
                        <h5>${activity.title}</h5>
                        <div class="a-meta">
                            <span><i class="fa-solid fa-location-dot"></i> ${activity.location || activity.city}</span>
                            <span><i class="fa-regular fa-clock"></i> ${activity.time}</span>
                            <span><i class="fa-solid fa-tag"></i> ${activity.type}</span>
                        </div>
                        <div class="a-desc">${activity.desc}${activity.approvalSource === "report" && activity.reportTitle ? `<div class="mt-2"><small class="text-muted-2"><i class="fa-solid fa-link me-1"></i>Linked report: ${activity.reportTitle}</small></div>` : ""}</div>
                        <div>
                            <div class="d-flex justify-content-between mt-2" style="font-size:.85rem">
                                <span class="text-muted-2">Available Spots</span>
                                <strong>${availableSpots}</strong>
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="fill" style="width:${progress}%"></div>
                            </div>
                        </div>
                        <div class="a-foot">
                            <a href="activity-details.html?id=${activity.id}" class="btn btn-ghost btn-sm">Details</a>
                            <button class="btn ${alreadyJoined ? "btn-success" : "btn-primary"} btn-sm join-btn" data-id="${activity.id}" ${!canJoin ? "disabled" : ""}>${buttonLabel}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        window.mwNav?.applyRoleAwareLinks(grid);

        grid.querySelectorAll(".join-btn").forEach((button) => {
            // handle click
            button.addEventListener("click", async () => {
                const activityId = button.dataset.id;
                if (!token) {
                    mwToast("Please log in to join activities.", "warn");
                    return;
                }

                if (!token || !["diver", "volunteer"].includes(currentRole)) {
                    mwToast("Please log in as a diver or volunteer to join activities.", "warn");
                    return;
                }

                try {
                    // call the api
                    const response = await fetch(window.apiUrl(`/api/activities/${encodeURIComponent(activityId)}/join`), {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({})
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || "Could not join activity.");

                    mwToast("Successfully joined the activity.", "success");

                    joinedIds.add(String(activityId));
                    // joined activity
                    const joinedActivity = activities.find((activity) => activity.id === String(activityId));
                    if (joinedActivity) {
                        joinedActivity.filled = Number(joinedActivity.filled || 0) + 1;
                        joinedActivity.availableSpots = Math.max(0, Number(joinedActivity.slots || 0) - joinedActivity.filled);
                        joinedActivity.available_spots = joinedActivity.availableSpots;
                    }

                    await Promise.all([fetchActivities(), fetchJoinedActivities()]);
                    renderActivities();
                } catch (error) {
                    console.error(error);
                    mwToast(error.message || "Could not join activity.", "error");
                }
            });
        });
    }

    [searchInput, cityFilter, typeFilter, statusFilter].forEach((element) => {
        if (!element) return;
        // handle input
        element.addEventListener("input", renderActivities);
        // handle change
        element.addEventListener("change", renderActivities);
    });

    (async () => {
        await Promise.all([fetchActivities(), fetchJoinedActivities()]);
        renderActivities();
    })();
});
