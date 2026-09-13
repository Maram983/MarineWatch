/* MarineWatch - Admin Login */

(function () {

    const form = document.getElementById("adminForm");

    if (!form) {
        return;
    }

    // handle form submit
    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = form.email;
        const password = form.password;

        const emailPattern = /^\S+@\S+\.\S+$/;

        let isValid = true;

        if (!emailPattern.test(email.value.trim())) {

            email.classList.add("is-invalid");
            isValid = false;

        } else {

            email.classList.remove("is-invalid");

        }

        if (password.value.length < 6) {

            password.classList.add("is-invalid");
            isValid = false;

        } else {

            password.classList.remove("is-invalid");

        }

        if (!isValid) {
            return;
        }

        try {

            // call the api
            const response = await fetch(window.apiUrl("/api/auth/login"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.value.trim(),
                    password: password.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Admin login failed");
            }

            const normalizedUser = {
                ...data.user,
                role: String(data.user.role || "").trim().toLowerCase()
            };

            if (normalizedUser.role !== "admin") {
                throw new Error("This account is not an administrator account.");
            }

            // save value
            localStorage.setItem("mw_token", data.token);
            // save value
            localStorage.setItem("mw_user", JSON.stringify(normalizedUser));

            mwToast("Welcome, Administrator.", "success");

            setTimeout(() => {

                window.location.href = "admin-dashboard.html";

            }, 500);

        } catch (error) {
            mwToast(error.message || "Admin login failed", "error");
        }

    });

})();