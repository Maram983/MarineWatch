/* MarineWatch - Profile */

(function () {
    let initialized = false;

    // get stored user
    function getStoredUser() {
        // read saved value
        return JSON.parse(localStorage.getItem("mw_user") || "{}") || {};
    }

    // format date
    function formatDate(value) {
        if (!value) return "Not provided";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Not provided";
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    // get initials
    function getInitials(name) {
        return String(name || "MarineWatch")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("") || "MW";
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

    // set fallback values
    function setFallbackValues(errorMessage = null) {
        const displayName = "MarineWatch member";
        document.querySelectorAll(".profile-header h1").forEach((el) => {
            el.textContent = displayName;
        });
        document.querySelectorAll(".profile-avatar").forEach((avatar) => {
            avatar.textContent = "MW";
        });

        setElementText("profileName", displayName);
        setElementText("profileEmail", "Not provided");
        setElementText("profileLocation", "Not provided");
        setElementText("profileFullName", "Not provided");
        setElementText("profileInfoEmail", "Not provided");
        setElementText("profilePhone", "Not provided");
        setElementText("profileEmergencyContact", "Not provided");
        setElementText("profileCity", "Not provided");
        setElementText("profileMemberSince", "Not provided");

        document.querySelectorAll(".role").forEach((element) => {
            element.innerHTML = `<i class="fa-solid fa-user me-1"></i> Member`;
        });

        setElementText("profileReportsCount", "0");
        setElementText("profileApprovedCount", "0");
        setElementText("profileDivesCount", "0");
        setElementText("profileSitesCount", "0");

        const infoMeta = document.querySelector(".info p");
        if (infoMeta) {
            infoMeta.innerHTML = `<i class="fa-solid fa-envelope me-2"></i>Not provided &nbsp;<i class="fa-solid fa-location-dot me-2"></i>Not provided`;
        }

        if (errorMessage) {
            mwToast(errorMessage, "error");
        }
    }

    // populate profile
    function populateProfile(user) {
        const normalizedUser = {
            ...getStoredUser(),
            ...user,
            role: String(user.role || getStoredUser().role || "").trim().toLowerCase()
        };

        // save value
        localStorage.setItem("mw_user", JSON.stringify(normalizedUser));

        const displayName = normalizedUser.full_name || normalizedUser.name || "MarineWatch member";
        const initials = getInitials(displayName);
        const roleLabel = normalizedUser.role === "diver"
            ? "Certified Diver"
            : normalizedUser.role === "volunteer"
                ? "Volunteer"
                : normalizedUser.role === "admin"
                    ? "Admin"
                    : "Member";

        document.querySelectorAll(".profile-header h1").forEach((el) => {
            el.textContent = displayName;
        });
        document.querySelectorAll(".profile-avatar").forEach((avatar) => {
            avatar.textContent = initials;
        });
        setElementText("profileName", displayName);
        setElementText("profileEmail", normalizedUser.email || "Not provided");
        setElementText("profileLocation", normalizedUser.city || "Not provided");
        setElementText("profileAvatar", initials);
        setElementText("profileFullName", displayName || "Not provided");
        setElementText("profileInfoEmail", normalizedUser.email || "Not provided");
        setElementText("profilePhone", normalizedUser.phone || "Not provided");
        setElementText("profileEmergencyContact", normalizedUser.emergency_contact || "Not provided");
        setElementText("profileCity", normalizedUser.city || "Not provided");
        setElementText("profileMemberSince", formatDate(normalizedUser.created_at));

        document.querySelectorAll(".role").forEach((element) => {
            element.innerHTML = `
                <i class="fa-solid ${normalizedUser.role === 'diver' ? 'fa-person-swimming' : normalizedUser.role === 'volunteer' ? 'fa-hands-holding-circle' : 'fa-shield-halved'} me-1"></i>
                ${roleLabel}
            `;
        });

        const infoMeta = document.querySelector(".info p");
        if (infoMeta) {
            infoMeta.innerHTML = `
                <i class="fa-solid fa-envelope me-2"></i>${normalizedUser.email || "Not provided"} &nbsp;
                <i class="fa-solid fa-location-dot me-2"></i>${normalizedUser.city || "Not provided"}
            `;
        }

        setElementText("profileCertificationNumber", normalizedUser.certification_number || "Not provided");
        setElementText("profileRole", roleLabel);
    }

    async function loadProfile() {
        if (initialized) return;
        initialized = true;

        // read saved value
        const token = localStorage.getItem("mw_token");
        if (!token) {
            setFallbackValues("Please log in to view your profile.");
            return;
        }

        try {
            // call the api
            const response = await fetch(window.apiUrl("/api/users/profile"), {
                headers: { Authorization: `Bearer ${token}` }
            });
            // data
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Could not load profile.");
            populateProfile(data.user || {});
        } catch (error) {
            console.error(error);
            setFallbackValues(error.message || "Unable to load profile details.");
        }
    }

    if (document.readyState === "loading") {
        // runs once the dom is ready
        document.addEventListener("DOMContentLoaded", loadProfile);
    } else {
        loadProfile();
    }

    // runs once the page is ready
    document.addEventListener("mw:ready", loadProfile);
})();
