/* MarineWatch - Register */

(function () {

    const form = document.getElementById("registerForm");
    const certGroup = document.getElementById("certGroup");

    if (!form) {
        return;
    }

    // update role
    function updateRole() {

        const role = form.querySelector("[name='role']:checked").value;

        document.querySelectorAll(".role-option").forEach((option) => {

            const input = option.querySelector("input");

            option.classList.toggle("active", input.checked);

        });

        if (role === "diver") {

            certGroup.style.display = "";
            form.cert.required = true;

        } else {

            certGroup.style.display = "none";
            form.cert.required = false;

        }

    }

    // handle change
    form.addEventListener("change", (event) => {

        if (event.target.name === "role") {
            updateRole();
        }

    });

    // Clear the red "invalid" state on a field as soon as it's fixed,
    // instead of leaving it stuck from a previous failed submit attempt.
    form.addEventListener("input", (event) => {

        const field = event.target;

        if (!field.classList || !field.classList.contains("form-control")) {
            return;
        }

        if (field.name === "confirm" || field.name === "password") {

            const passwordOk = form.password.value.length >= 8;
            const confirmOk = form.confirm.value === form.password.value && form.confirm.value.length > 0;

            if (passwordOk) form.password.classList.remove("is-invalid");
            if (confirmOk) form.confirm.classList.remove("is-invalid");

        } else if (field.classList.contains("is-invalid")) {

            field.classList.remove("is-invalid");

        }

    });

    updateRole();

    // handle form submit
    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const emailPattern = /^\S+@\S+\.\S+$/;

        let isValid = true;

        // validate
        function validate(field, condition) {

            field.classList.toggle("is-invalid", !condition);

            if (!condition) {
                isValid = false;
            }

        }

        validate(
            form.name,
            form.name.value.trim().length >= 2
        );

        validate(
            form.email,
            emailPattern.test(form.email.value.trim())
        );

        validate(
            form.password,
            form.password.value.length >= 8
        );

        validate(
            form.confirm,
            form.confirm.value === form.password.value &&
            form.confirm.value.length > 0
        );

        if (form.cert.required) {

            validate(
                form.cert,
                form.cert.value.trim().length >= 4
            );

        }

        const termsAccepted = document.getElementById("terms").checked;

        if (!termsAccepted) {

            mwToast("Please accept the terms.", "warn");
            isValid = false;

        }

        if (!isValid) {
            mwToast("Please check the highlighted fields and try again.", "error");
            return;
        }

        const role = form.querySelector("[name='role']:checked").value;

        try {
            // removed debug logging for production

            // call the api
            const response = await fetch(window.apiUrl("/api/auth/register"), {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    full_name: form.name.value.trim(),
                    username: form.name.value.trim(),
                    email: form.email.value.trim(),
                    password: form.password.value,
                    confirmPassword: form.confirm.value,
                    role: role,
                    certification_number: role === 'diver' ? form.cert.value.trim() : undefined
                })

            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            mwToast("Account created successfully!", "success");

            setTimeout(() => {

                window.location.href = "login.html";

            }, 1000);

        } catch (error) {

            mwToast(error.message || "Registration failed", "error");

        }

    });

})();