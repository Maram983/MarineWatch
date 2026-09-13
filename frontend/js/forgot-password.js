/* MarineWatch - Forgot Password */

(function () {

    const form = document.getElementById("forgotForm");

    if (!form) {
        return;
    }

    // handle form submit
    form.addEventListener("submit", (event) => {

        event.preventDefault();

        const email = form.email;
        const emailPattern = /^\S+@\S+\.\S+$/;

        if (!emailPattern.test(email.value.trim())) {

            email.classList.add("is-invalid");
            return;

        }

        email.classList.remove("is-invalid");

        const successMessage = document.getElementById("successMsg");

        if (successMessage) {
            successMessage.style.display = "block";
        }

        mwToast("Reset link sent (demo).", "success");

    });

})();