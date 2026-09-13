/* MarineWatch - Login */

(function () {


    const form = document.getElementById("loginForm");

    if (!form) {
        return;
    }

    // handle form submit
    form.addEventListener("submit", (event) => {

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

        // removed debug logging for production

        // call the api
        fetch(window.apiUrl("/api/auth/login"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.value.trim(),
                password: password.value
            })
        })
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Login failed");
                }

                const { token, user } = data;
                const normalizedUser = {
                    ...user,
                    role: String(user.role || '').trim().toLowerCase()
                };

                // save value
                localStorage.setItem("mw_token", token);
                // save value
                localStorage.setItem("mw_user", JSON.stringify(normalizedUser));

                mwToast("Signed in successfully", "success");

                setTimeout(() => {
                    if (normalizedUser.role === "admin") {
                        window.location.href = "admin-dashboard.html";
                    } else if (normalizedUser.role === "diver") {
                        window.location.href = "diver-dashboard.html";
                    } else if (normalizedUser.role === "volunteer") {
                        window.location.href = "volunteer-dashboard.html";
                    } else {
                        window.location.href = "login.html";
                    }
                }, 500);
            })
            .catch((error) => {
                mwToast(error.message || "Login failed", "error");
            });

    });

})();