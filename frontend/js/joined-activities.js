/* MarineWatch - Joined Activities */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    // read saved value
    const token = localStorage.getItem("mw_token");
    const tabs = document.querySelectorAll("#tabs button");
    const container = document.getElementById("grid");

    const activities = {
        upcoming: [],
        completed: [],
        cancelled: []
    };

    const statusBadges = {
        confirmed: '<span class="mw-badge mw-badge-green">Confirmed</span>',
        completed: '<span class="mw-badge mw-badge-blue">Completed</span>',
        cancelled: '<span class="mw-badge mw-badge-red">Cancelled</span>'
    };

    const sampleActivities = {
        upcoming: [
            {
                id: "sample-1",
                title: "Coastal Plastic Cleanup",
                city: "Jeddah",
                activity_date: "2026-09-10",
                activity_time: "08:30 AM",
                type: "Cleanup",
                status: "confirmed",
                slots: 20,
                filled: 12
            },
            {
                id: "sample-2",
                title: "Reef Health Survey",
                city: "Al Khobar",
                activity_date: "2026-09-18",
                activity_time: "10:00 AM",
                type: "Survey",
                status: "confirmed",
                slots: 16,
                filled: 8
            },
            {
                id: "sample-3",
                title: "Seagrass Monitoring Patrol",
                city: "Dammam",
                activity_date: "2026-10-02",
                activity_time: "07:45 AM",
                type: "Monitoring",
                status: "confirmed",
                slots: 14,
                filled: 7
            }
        ],
        completed: [
            {
                id: "sample-4",
                title: "Mangrove Restoration Day",
                city: "Jeddah",
                activity_date: "2026-08-15",
                activity_time: "09:00 AM",
                type: "Restoration",
                status: "completed",
                slots: 18,
                filled: 18
            },
            {
                id: "sample-6",
                title: "Coral Reef Survey",
                city: "Yanbu",
                activity_date: "2026-07-28",
                activity_time: "11:00 AM",
                type: "Survey",
                status: "completed",
                slots: 12,
                filled: 12
            },
            {
                id: "sample-7",
                title: "Turtle Nesting Awareness",
                city: "Jeddah",
                activity_date: "2026-07-05",
                activity_time: "05:30 PM",
                type: "Awareness",
                status: "completed",
                slots: 20,
                filled: 20
            }
        ],
        cancelled: [
            {
                id: "sample-5",
                title: "Night Beach Watch",
                city: "Jeddah",
                activity_date: "2026-08-22",
                activity_time: "07:00 PM",
                type: "Awareness",
                status: "cancelled",
                slots: 20,
                filled: 0
            },
            {
                id: "sample-8",
                title: "Community Dive Cleanup",
                city: "Dammam",
                activity_date: "2026-08-30",
                activity_time: "09:00 AM",
                type: "Cleanup",
                status: "cancelled",
                slots: 15,
                filled: 0
            },
            {
                id: "sample-9",
                title: "Volunteer Training Session",
                city: "Al Khobar",
                activity_date: "2026-09-05",
                activity_time: "02:00 PM",
                type: "Training",
                status: "cancelled",
                slots: 25,
                filled: 0
            }
        ]
    };

    // set empty state
    function setEmptyState(message) {
        if (!container) return;
        container.innerHTML = `
            <div class="mw-empty" style="grid-column:1/-1">
                <i class="fa-solid fa-calendar-xmark"></i>
                <h4>${message}</h4>
                <p>You don't have any activities in this section.</p>
            </div>
        `;
    }

    // normalize joined status
    function normalizeJoinedStatus(activity) {
        const participantStatus = (activity.participant_status || activity.participantStatus || "").toLowerCase();
        const activityStatus = (activity.status || "").toLowerCase();

        if (participantStatus === "completed" || activityStatus === "completed") {
            return "completed";
        }
        if (participantStatus === "cancelled" || activityStatus === "cancelled") {
            return "cancelled";
        }
        if (participantStatus === "joined" || activityStatus === "open" || activityStatus === "confirmed") {
            return "confirmed";
        }
        return activityStatus || participantStatus || "confirmed";
    }

    async function loadJoinedActivities() {
        let list = [];

        if (token) {
            try {
                // call the api
                const response = await fetch(window.apiUrl("/api/activities/joined"), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Could not load joined activities.");
                list = Array.isArray(data) ? data : [];
            } catch (error) {
                console.error(error);
            }
        }

        activities.upcoming = list.filter((activity) => normalizeJoinedStatus(activity) === "confirmed");
        activities.completed = list.filter((activity) => normalizeJoinedStatus(activity) === "completed");
        activities.cancelled = list.filter((activity) => normalizeJoinedStatus(activity) === "cancelled");
    }

    // render activities
    function renderActivities(tabName) {
        if (!container) return;

        const list = activities[tabName] || [];
        if (!list.length) {
            setEmptyState("No activities found");
            return;
        }

        container.innerHTML = list.map((activity) => {
            const statusKey = normalizeJoinedStatus(activity);
            const badge = statusBadges[statusKey] || statusBadges.confirmed;
            const leaveButton = statusKey === "confirmed" || statusKey === "joined"
                ? `<button class="btn btn-danger btn-sm leave-btn" data-id="${activity.id}">Leave</button>`
                : "";

            const participants = activity.participants || `${activity.filled || 0}/${activity.slots || 0}`;
            const progress = activity.slots ? Math.round((activity.filled || 0) / activity.slots * 100) : 0;

            return `
                <div class="activity-card">
                    <div class="a-image">
                        <div class="date-chip"><i class="fa-regular fa-calendar me-1"></i>${MW.formatDateString(activity.activity_date || activity.date || "TBD")}</div>
                        <div class="status-chip">${badge}</div>
                    </div>
                    <div class="a-body">
                        <h5>${activity.title}</h5>
                        <div class="a-meta">
                            <span><i class="fa-solid fa-location-dot"></i> ${activity.city || "Unknown"}</span>
                            <span><i class="fa-regular fa-clock"></i> ${activity.activity_time || activity.time || "TBD"}</span>
                            <span><i class="fa-solid fa-tag"></i> ${activity.type || "Activity"}</span>
                        </div>
                        <div class="mt-2">
                            <div class="d-flex justify-content-between" style="font-size:.85rem">
                                <span class="text-muted-2">Participants</span>
                                <strong>${participants}</strong>
                            </div>
                            <div class="progress-bar-wrap mt-2">
                                <div class="fill" style="width:${progress}%"></div>
                            </div>
                        </div>
                        <div class="a-foot mt-3">
                            <a href="activity-details.html?id=${activity.id}" class="btn btn-outline-navy btn-sm">Details</a>
                            ${leaveButton}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        window.mwNav?.applyRoleAwareLinks(container);

        container.querySelectorAll(".leave-btn").forEach((button) => {
            // handle click
            button.addEventListener("click", async () => {
                const activityId = button.dataset.id;
                try {
                    // call the api
                    const response = await fetch(window.apiUrl(`/api/activities/${encodeURIComponent(activityId)}/leave`), {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || "Could not leave activity.");

                    mwToast("Activity removed", "warn");
                    await loadJoinedActivities();
                    renderActivities(tabName);
                } catch (error) {
                    console.error(error);
                    mwToast(error.message || "Could not leave activity.", "error");
                }
            });
        });
    }

    tabs.forEach((button) => {
        // handle click
        button.addEventListener("click", async () => {
            tabs.forEach((tab) => tab.classList.remove("active"));
            button.classList.add("active");
            renderActivities(button.dataset.tab);
        });
    });

    (async () => {
        await loadJoinedActivities();
        renderActivities("upcoming");
    })();
});