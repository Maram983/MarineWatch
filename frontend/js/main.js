 /* MarineWatch - Shared Functions */

(function () {

    // read saved value
    const storedApiBaseUrl = localStorage.getItem("mw_api_base_url") || window.API_BASE_URL || "https://marinewatch-ksa-9sz3.onrender.com";
    const resolvedApiBaseUrl = String(storedApiBaseUrl).replace(/\/$/, "");

    window.API_BASE_URL = resolvedApiBaseUrl;
    window.apiUrl = function (path = "") {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        return `${window.API_BASE_URL}${normalizedPath}`;
    };

    window.MW = window.MW || {};
    window.MW.formatDateString = function (value) {
        if (value === null || value === undefined) {
            return "";
        }
        const raw = String(value).trim();
        if (!raw) {
            return "";
        }
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
            return raw;
        }
        return parsed.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = function (resource, init) {
        if (typeof resource === "string") {
            resource = resource.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):55002(?=\/|$)/i, window.API_BASE_URL);
        }

        return originalFetch(resource, init);
    };

    // get normalized user role
    function getNormalizedUserRole() {
        // read saved value
        const user = JSON.parse(localStorage.getItem("mw_user") || "{}") || {};
        return String(user.role || "").trim().toLowerCase();
    }

    // resolve role aware href
    function resolveRoleAwareHref(href) {
        if (!href || href.startsWith("#") || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
            return href;
        }

        const role = getNormalizedUserRole();
        const [pathPart, queryPart] = String(href).split("?");
        const cleanPath = pathPart.replace(/^\.\//, "").replace(/^\.\//, "");

        let resolvedPath = cleanPath;

        if (cleanPath === "diver-dashboard.html") {
            resolvedPath = role === "admin" ? "admin-dashboard.html" : role === "volunteer" ? "volunteer-dashboard.html" : "diver-dashboard.html";
        } else if (cleanPath === "volunteer-dashboard.html") {
            resolvedPath = role === "admin" ? "admin-dashboard.html" : role === "diver" ? "diver-dashboard.html" : "volunteer-dashboard.html";
        } else if (cleanPath === "profile.html") {
            resolvedPath = role === "volunteer" ? "volunteer-profile.html" : role === "admin" ? "admin-dashboard.html" : "profile.html";
        } else if (cleanPath === "volunteer-profile.html") {
            resolvedPath = role === "diver" ? "profile.html" : role === "admin" ? "admin-dashboard.html" : "volunteer-profile.html";
        } else if (cleanPath === "diver-edit-profile.html") {
            resolvedPath = role === "volunteer" ? "volunteer-edit-profile.html" : "diver-edit-profile.html";
        } else if (cleanPath === "volunteer-edit-profile.html") {
            resolvedPath = role === "diver" ? "diver-edit-profile.html" : "volunteer-edit-profile.html";
        } else if (cleanPath === "submit-report.html") {
            resolvedPath = role === "volunteer" ? "activities.html" : "submit-report.html";
        } else if (cleanPath === "my-reports.html") {
            resolvedPath = role === "volunteer" ? "my-activities.html" : "my-reports.html";
        } else if (cleanPath === "joined-activities.html") {
            resolvedPath = "my-activities.html";
        }

        return queryPart ? `${resolvedPath}?${queryPart}` : resolvedPath;
    }

    // apply role aware links
    function applyRoleAwareLinks(root = document) {
        root.querySelectorAll("a[href]").forEach((link) => {
            const originalHref = link.getAttribute("href");
            const resolvedHref = resolveRoleAwareHref(originalHref);
            if (resolvedHref !== originalHref) {
                link.setAttribute("href", resolvedHref);
            }
        });
    }

    // enforce role access
    function enforceRoleAccess() {
        const role = getNormalizedUserRole();
        const pageName = window.location.pathname.split("/").pop();

        if (!role || !pageName) {
            return;
        }

        if (role === "volunteer") {
            const redirectMap = {
                "diver-dashboard.html": "volunteer-dashboard.html",
                "profile.html": "volunteer-profile.html",
                "diver-edit-profile.html": "volunteer-edit-profile.html",
                "submit-report.html": "activities.html",
                "my-reports.html": "my-activities.html",
                "report-success.html": "volunteer-dashboard.html"
            };

            const target = redirectMap[pageName];
            if (target && target !== pageName) {
                window.location.replace(target);
            }
        }

        if (role === "diver") {
            const redirectMap = {
                "volunteer-dashboard.html": "diver-dashboard.html",
                "volunteer-profile.html": "profile.html",
                "volunteer-edit-profile.html": "diver-edit-profile.html"
            };

            const target = redirectMap[pageName];
            if (target && target !== pageName) {
                window.location.replace(target);
            }
        }
    }

    async function refreshAdminSidebarCounts() {
        const role = getNormalizedUserRole();
        if (role !== 'admin') return;

        const badge = document.getElementById('sidebarReviewBadge');
        if (!badge) return;

        // read saved value
        const token = localStorage.getItem('mw_token');
        if (!token) return;

        try {
            // call the api
            const response = await fetch(window.apiUrl('/api/admin/reports'), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) return;

            const data = await response.json();
            if (!Array.isArray(data)) return;

            // pending count
            const pendingCount = data.reduce((count, report) => count + ((String(report.status || '').toLowerCase() === 'pending') ? 1 : 0), 0);
            badge.textContent = pendingCount;
        } catch (error) {
            console.error('Unable to refresh admin sidebar counts', error);
        }
    }

    window.mwNav = {
        getRole: getNormalizedUserRole,
        resolveHref: resolveRoleAwareHref,
        applyRoleAwareLinks
    };

    async function includeAll() {
        const elements = document.querySelectorAll("[data-include]");

        await Promise.all(Array.from(elements).map(async (element) => {
            let filePath = element.getAttribute("data-include");
            const normalizedRole = getNormalizedUserRole();

            if (filePath.includes("sidebar-auto.html")) {
                if (normalizedRole === "admin") {
                    filePath = "components/sidebar-admin.html";
                } else if (normalizedRole === "volunteer") {
                    filePath = "components/sidebar-volunteer.html";
                } else if (normalizedRole === "diver") {
                    filePath = "components/sidebar-diver.html";
                } else {
                    filePath = "components/sidebar-diver.html";
                }
            }

            try {
                // call the api
                const response = await fetch(filePath);
                const html = await response.text();
                element.innerHTML = html;
            } catch (error) {
                console.error("Failed to load:", filePath, error);
            }
        }));

        applyRoleAwareLinks(document);
        enforceRoleAccess();
        onIncludesReady();
    }

    // on includes ready
    function onIncludesReady() {
        const currentNav = document.body.dataset.nav;

        if (currentNav) {
            document.querySelectorAll(`[data-nav="${currentNav}"]`).forEach((item) => item.classList.add("active"));
        }

        const currentSidebar = document.body.dataset.sb;

        if (currentSidebar) {
            document.querySelectorAll(`[data-sb="${currentSidebar}"]`).forEach((item) => item.classList.add("active"));
        }

        const menuButton = document.querySelector(".menu-toggle");
        const sidebar = document.getElementById("appSidebar");

        if (menuButton && sidebar) {
            let backdrop = document.querySelector(".sidebar-backdrop");

            if (!backdrop) {
                backdrop = document.createElement("div");
                backdrop.className = "sidebar-backdrop";
                document.body.appendChild(backdrop);
            }

            // handle click
            menuButton.addEventListener("click", () => {
                sidebar.classList.toggle("open");
                backdrop.classList.toggle("show");
            });

            // handle click
            backdrop.addEventListener("click", () => {
                sidebar.classList.remove("open");
                backdrop.classList.remove("show");
            });

            // handle resize
            window.addEventListener("resize", () => {
                if (window.innerWidth > 991) {
                    sidebar.classList.remove("open");
                    backdrop.classList.remove("show");
                }
            });
        }

        document.dispatchEvent(new CustomEvent("mw:ready"));
        refreshAdminSidebarCounts();
    }

    // handle click
    document.addEventListener("click", (event) => {
        const button = event.target.closest(".toggle-pw");

        if (!button) {
            return;
        }

        const input = button.parentElement.querySelector("input");

        if (!input) {
            return;
        }

        const hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        button.innerHTML = hidden
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';
    });

    window.mwToast = function (message, type = "info") {
        let host = document.getElementById("mw-toast-host");

        if (!host) {
            host = document.createElement("div");
            host.id = "mw-toast-host";
            host.style.cssText = "position:fixed;top:20px;right:20px;z-index:2000;display:flex;flex-direction:column;gap:8px;";
            document.body.appendChild(host);
        }

        const colors = {
            info: "#1976D2",
            success: "#10B981",
            warn: "#F59E0B",
            error: "#EF4444"
        };

        const toast = document.createElement("div");
        toast.style.cssText = `background:#fff;border-left:4px solid ${colors[type] || colors.info};padding:12px 16px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.15);font-weight:600;color:#0A2540;min-width:240px;`;
        toast.textContent = message;

        host.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = "opacity .3s";
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    };

    if (document.readyState === "loading") {
        // runs once the dom is ready
        document.addEventListener("DOMContentLoaded", includeAll);
    } else {
        includeAll();
    }
})();