/* MarineWatch - Volunteer Dashboard */

(function () {
    let initialized = false;

    // get stored user
    function getStoredUser() {
        // read saved value
        return JSON.parse(localStorage.getItem("mw_user") || "{}") || {};
    }

    // get initials
    function getInitials(name) {
        return String(name || "User")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word.charAt(0).toUpperCase())
            .join("") || "U";
    }

    // set element text
    function setElementText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // set element html
    function setElementHtml(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = value;
        }
    }

    async function loadVolunteerDashboard() {
        if (initialized) return;
        initialized = true;

        // read saved value
        const token = localStorage.getItem("mw_token");
        const user = getStoredUser();
        const name = user.full_name || user.name || "User";
        const normalizedRole = String(user.role || "").trim().toLowerCase();

        setElementText("topUserName", name);
        setElementText("welcomeUserName", name);
        setElementText("topUserAvatar", getInitials(name));
        document.querySelector("a.user-chip")?.querySelector("span:last-child")?.replaceChildren(document.createTextNode(name));

        if (normalizedRole && normalizedRole !== "volunteer") {
            const welcome = document.getElementById("welcomeUserName");
            if (welcome) {
                welcome.textContent = `${name} (${normalizedRole})`;
            }
        }

        let activities = [];
        let loadError = null;

        try {
            // call the api
            const response = await fetch(window.apiUrl("/api/activities/joined"), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Could not load your activities");
            activities = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(error);
            loadError = error;
            activities = [];
        }

        const joinedCount = activities.length;
        // volunteer hours
        const volunteerHours = activities.reduce((total, activity) => total + Number(activity.hours || 0), 0);
        // upcoming count
        const upcomingCount = activities.filter((activity) => (activity.status || "").toLowerCase() === "confirmed").length;

        setElementText("volunteerJoinedCount", joinedCount);
        setElementText("volunteerHoursCount", volunteerHours);
        setElementText("volunteerUpcomingCount", upcomingCount);

        const chartCanvas = document.getElementById("vChart");
        if (chartCanvas && window.Chart) {
            // Build the last 6 months (oldest -> newest) and sum this
            // volunteer's real hours into each month from their joined
            // activities, instead of showing placeholder numbers.
            const monthBuckets = [];
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                monthBuckets.push({
                    key: `${d.getFullYear()}-${d.getMonth()}`,
                    label: d.toLocaleString("en-US", { month: "short" }),
                    hours: 0
                });
            }

            activities.forEach((activity) => {
                const rawDate = activity.activity_date || activity.date;
                if (!rawDate) return;
                const d = new Date(rawDate);
                if (Number.isNaN(d.getTime())) return;
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                // bucket
                const bucket = monthBuckets.find((m) => m.key === key);
                if (bucket) bucket.hours += Number(activity.hours || 0);
            });

            new Chart(chartCanvas, {
                type: "bar",
                data: {
                    labels: monthBuckets.map((m) => m.label),
                    datasets: [
                        {
                            label: "Hours",
                            data: monthBuckets.map((m) => m.hours),
                            backgroundColor: "#1976D2",
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: "#EEF2F7" } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        const upcoming = document.getElementById("upcoming");
        if (upcoming) {
            upcoming.innerHTML = activities.length
                ? activities.map((activity) => {
                    const rawDate = activity.activity_date || activity.date || "TBD";
                    const formattedDate = MW.formatDateString(rawDate) || "TBD";
                    const month = rawDate === "TBD" ? "TBD" : new Date(rawDate).toLocaleString("en-US", { month: "short" }).toUpperCase();
                    const day = rawDate === "TBD" ? "—" : new Date(rawDate).getDate();
                    const title = activity.title || "Activity";
                    const city = activity.city || "Unknown";
                    const slots = `${activity.filled || 0}/${activity.slots || 0}`;
                    return `
                        <div class="d-flex align-items-center gap-3 py-2 border-bottom">
                            <div style="width:52px;height:52px;border-radius:12px;background:var(--mw-gradient);color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;font-weight:800">
                                <span style="font-size:.65rem;text-transform:uppercase">${month}</span>
                                <span>${day}</span>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-bold text-navy">${title}</div>
                                <div class="text-muted-2" style="font-size:.85rem">
                                    <i class="fa-solid fa-location-dot me-1"></i>${city}
                                    ·
                                    <i class="fa-solid fa-users ms-1 me-1"></i>${slots}
                                </div>
                            </div>
                            <span class="mw-badge mw-badge-green">Confirmed</span>
                        </div>`;
                }).join("")
                : `<div class="text-muted-2">No activities joined yet.</div>`;
        }
    }

    if (document.readyState === "loading") {
        // runs once the dom is ready
        document.addEventListener("DOMContentLoaded", loadVolunteerDashboard);
    } else {
        loadVolunteerDashboard();
    }

    // runs once the page is ready
    document.addEventListener("mw:ready", loadVolunteerDashboard);
})();