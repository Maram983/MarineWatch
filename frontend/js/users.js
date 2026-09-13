/* MarineWatch - Users */

window.MW_USERS = [

    {
        id: "U-001",
        name: "Ahmed Al-Diver",
        email: "ahmed@example.com",
        role: "diver",
        city: "Jeddah",
        reports: 28,
        status: "active",
        joined: "2025-03-14"
    },

    {
        id: "U-002",
        name: "Sara Al-Volunteer",
        email: "sara@example.com",
        role: "volunteer",
        city: "Jeddah",
        reports: 0,
        status: "active",
        joined: "2025-05-08"
    },

    {
        id: "U-004",
        name: "Sami Al-Malki",
        email: "sami@example.com",
        role: "diver",
        city: "Yanbu",
        reports: 14,
        status: "active",
        joined: "2025-06-19"
    },

    {
        id: "U-005",
        name: "Reem Al-Juhani",
        email: "reem@example.com",
        role: "volunteer",
        city: "Dammam",
        reports: 0,
        status: "pending",
        joined: "2026-06-22"
    },

    {
        id: "U-006",
        name: "Faisal Al-Harbi",
        email: "faisal@example.com",
        role: "diver",
        city: "Umluj",
        reports: 9,
        status: "active",
        joined: "2025-09-11"
    },

    {
        id: "U-007",
        name: "Layan A.",
        email: "layan@example.com",
        role: "volunteer",
        city: "NEOM",
        reports: 0,
        status: "active",
        joined: "2026-01-30"
    },

    {
        id: "U-008",
        name: "Fahad K.",
        email: "fahad@example.com",
        role: "diver",
        city: "Jazan",
        reports: 5,
        status: "suspended",
        joined: "2025-11-04"
    },

    {
        id: "U-010",
        name: "Zainab M.",
        email: "zainab@example.com",
        role: "volunteer",
        city: "Jeddah",
        reports: 0,
        status: "active",
        joined: "2026-04-17"
    }

];

window.MW_USER_RENDER = function (selectedRole = null) {

    const searchText =
        document.getElementById("q").value.toLowerCase().trim();

    const selectedStatus =
        document.getElementById("fStatus").value;

    // filtered users
    const filteredUsers = MW_USERS.filter(user => {

        const matchesRole =
            !selectedRole ||
            user.role === selectedRole;

        const matchesSearch =
            !searchText ||
            (
                user.name +
                user.email +
                user.city
            )
            .toLowerCase()
            .includes(searchText);

        const matchesStatus =
            !selectedStatus ||
            user.status === selectedStatus;

        return matchesRole &&
               matchesSearch &&
               matchesStatus;

    });

    const roleBadges = {

        diver:
            '<span class="mw-badge mw-badge-blue">Diver</span>',

        volunteer:
            '<span class="mw-badge mw-badge-teal">Volunteer</span>'

    };

    const statusBadges = {

        active:
            '<span class="mw-badge mw-badge-green">Active</span>',

        pending:
            '<span class="mw-badge mw-badge-amber">Pending</span>',

        suspended:
            '<span class="mw-badge mw-badge-red">Suspended</span>'

    };

    const rows = document.getElementById("rows");

    if (!filteredUsers.length) {

        rows.innerHTML = `

        <tr>
            <td colspan="7">

                <div class="mw-empty">

                    <i class="fa-solid fa-user-slash"></i>

                    <div>No users found.</div>

                </div>

            </td>
        </tr>

        `;

        return;

    }

    rows.innerHTML = filteredUsers.map(user => {

        const initials = user.name
            .split(" ")
            .map(x => x[0])
            .slice(0,2)
            .join("");

        return `

        <tr>

            <td data-label="User">

                <div class="avatar-cell">

                    <div class="av">

                        ${initials}

                    </div>

                    <div>

                        <div class="n">

                            ${user.name}

                        </div>

                        <div class="e">

                            ${user.email}

                        </div>

                    </div>

                </div>

            </td>

            <td data-label="Role">

                ${roleBadges[user.role]}

            </td>

            <td data-label="City">

                ${user.city}

            </td>

            <td data-label="Reports">

                ${user.reports}

            </td>

            <td data-label="Status">

                ${statusBadges[user.status]}

            </td>

            <td data-label="Joined">

                ${user.joined}

            </td>

            <td data-label="Actions">

                <div class="row-actions">

                    <button
                        onclick="location.href='user-details.html?id=${user.id}'"
                        title="View">

                        <i class="fa-solid fa-eye"></i>

                    </button>

                    <button
                        onclick="mwToast('Edit ${user.id}','info')"
                        title="Edit">

                        <i class="fa-solid fa-pen"></i>

                    </button>

                    <button
                        class="danger"
                        onclick="if(confirm('Delete ${user.name}?')) mwToast('Deleted','warn')"
                        title="Delete">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            </td>

        </tr>

        `;

    }).join("");

};

// runs once the page is ready
document.addEventListener("mw:ready", () => {

    let currentRole = null;

    document.querySelectorAll("#tabs button").forEach(button => {

        // handle click
        button.addEventListener("click", () => {

            document.querySelectorAll("#tabs button")
                .forEach(item => item.classList.remove("active"));

            button.classList.add("active");

            currentRole = button.dataset.role || null;

            MW_USER_RENDER(currentRole);

        });

    });

    ["q","fStatus"].forEach(id => {

        const input = document.getElementById(id);

        if (!input) return;

        // handle input
        input.addEventListener("input", () => {

            MW_USER_RENDER(currentRole);

        });

    });

    MW_USER_RENDER();

});