/* ==========================================================
   MarineWatch
   Location Details
========================================================== */

// runs once the page is ready
document.addEventListener("mw:ready", () => {

    /* ==========================================
       Sample Locations
    ========================================== */

    const locations = [

        {
            id: "LOC-001",

            name: "Jeddah Corniche",

            city: "Jeddah",

            description:
                "One of the most visited coastal areas in Saudi Arabia. MarineWatch continuously monitors this location using approved environmental reports.",

            health: 82,

            severity: "low",

            status: "Monitoring",

            cleanup: "Scheduled",

            updated: "Today",

            lat: 21.5433,

            lng: 39.1728,

            pollution: [
                "Plastic Waste",
                "Fishing Gear"
            ],

            conditions: [

                {
                    title: "Water Quality",
                    value: "Good"
                },

                {
                    title: "Visibility",
                    value: "18 m"
                },

                {
                    title: "Marine Life",
                    value: "Healthy"
                },

                {
                    title: "Risk Level",
                    value: "Low"
                }

            ],

            recommendations: [

                "Continue weekly monitoring.",

                "Schedule volunteer cleanup.",

                "Avoid anchoring near coral reef.",

                "Encourage divers to report pollution."

            ],

            history: [

                {
                    title: "Plastic pollution reported",

                    date: "Today",

                    text: "Small amount of floating plastic detected."
                },

                {
                    title: "Beach cleanup completed",

                    date: "Yesterday",

                    text: "Volunteer team removed approximately 60 kg of waste."
                },

                {
                    title: "Water quality improved",

                    date: "5 days ago",

                    text: "Marine health score increased after cleanup."
                }

            ]

        }

    ];



    /* ==========================================
       Get Selected Location
    ========================================== */

    const params = new URLSearchParams(window.location.search);

    const locationId = params.get("id") || "LOC-001";



    const location =

        locations.find(item => item.id === locationId)

        || locations[0];



    /* ==========================================
       Hero
    ========================================== */

    document.getElementById("lName").textContent =
        location.name;

    document.getElementById("lRegion").textContent =
        location.city;

    document.getElementById("lDesc").textContent =
        location.description;

    document.getElementById("lUpdated").textContent =
        location.updated;

    document.getElementById("lScore").textContent =
        location.health;

    document.getElementById("healthFill").style.width =
        location.health + "%";



    document.getElementById("lStatus").textContent =
        location.status;

    document.getElementById("lCleanup").textContent =
        location.cleanup;

    document.getElementById("lReportsCount").textContent =
        location.history.length;
            /* ==========================================
       Marine Conditions
    ========================================== */

    const conditionsContainer =
        document.getElementById("lConditions");

    conditionsContainer.innerHTML =
        location.conditions.map(condition => `

            <div class="condition-card">

                <label>

                    ${condition.title}

                </label>

                <strong>

                    ${condition.value}

                </strong>

            </div>

        `).join("");



    /* ==========================================
       Pollution Badges
    ========================================== */

    const badgeColors = {

        "Plastic Waste":"mw-badge-blue",

        "Fishing Gear":"mw-badge-amber",

        "Oil":"mw-badge-red",

        "Chemical":"mw-badge-red",

        "Debris":"mw-badge-gray"

    };



    document.getElementById("lBadges").innerHTML =

        location.pollution.map(item => `

            <span class="mw-badge ${badgeColors[item] || "mw-badge-teal"}">

                <i class="fa-solid fa-circle me-1"></i>

                ${item}

            </span>

        `).join("");



    /* ==========================================
       Recommended Actions
    ========================================== */

    document.getElementById("lRecs").innerHTML =

        location.recommendations.map(action => `

            <li>

                <i class="fa-solid fa-check-circle"></i>

                <span>

                    ${action}

                </span>

            </li>

        `).join("");



    /* ==========================================
       Cleanup Timeline
    ========================================== */

    document.getElementById("timeline").innerHTML = `

        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-title">

                Pollution reports received

            </div>

            <div class="timeline-date">

                6 days ago

            </div>

        </div>

        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-title">

                Reports verified

            </div>

            <div class="timeline-date">

                5 days ago

            </div>

        </div>

        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-title">

                Cleanup scheduled

            </div>

            <div class="timeline-date">

                Tomorrow

            </div>

        </div>

    `;



    /* ==========================================
       Environmental History
    ========================================== */

    document.getElementById("lReports").innerHTML =

        location.history.map(item => `

            <div class="history-card">

                <div class="history-title">

                    ${item.title}

                </div>

                <div class="history-meta">

                    ${MW.formatDateString(item.date || "TBD")}

                </div>

                <div class="history-text">

                    ${item.text}

                </div>

            </div>

        `).join("");



    /* ==========================================
       Leaflet Map
    ========================================== */

    const map = L.map("detailMap", {

        scrollWheelZoom:false

    }).setView(

        [

            location.lat,

            location.lng

        ],

        12

    );



    L.tileLayer(

        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",

        {

            attribution:"© OpenStreetMap © CARTO"

        }

    ).addTo(map);



    L.circleMarker(

        [

            location.lat,

            location.lng

        ],

        {

            radius:10,

            color:"#fff",

            weight:3,

            fillColor:"#1976D2",

            fillOpacity:1

        }

    )

    .bindPopup(`

        <strong>

            ${location.name}

        </strong>

        <br>

        Marine Health:

        ${location.health}/100

    `)

    .addTo(map)

    .openPopup();

});