/* ==========================================================
   MarineWatch
   Edit Profile
========================================================== */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    const form = document.getElementById("profileForm");
    if (!form) return;

    const fullNameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const cityInput = document.getElementById("city");
    const emergencyContactInput = document.getElementById("emergencyContact");
    const currentPassword = document.getElementById("currentPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");

    // read saved value
    const token = localStorage.getItem("mw_token");
    let currentUser = {};

    async function loadProfile() {
        if (!token) {
            mwToast("Please login to edit your profile.", "warn");
            return;
        }

        try {
            // call the api
            const response = await fetch(window.apiUrl("/api/users/profile"), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Could not load profile.");
            }

            currentUser = data.user || {};
            if (fullNameInput) fullNameInput.value = currentUser.full_name || "";
            if (emailInput) {
                emailInput.value = currentUser.email || "";
                emailInput.readOnly = true;
            }
            if (phoneInput) phoneInput.value = currentUser.phone || "";
            if (cityInput) cityInput.value = currentUser.city || "";
            if (emergencyContactInput) emergencyContactInput.value = currentUser.emergency_contact || "";
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not load profile.", "error");
        }
    }

    // handle form submit
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!token) {
            mwToast("Please login to update your profile.", "warn");
            return;
        }

        if (newPassword.value !== "" || confirmPassword.value !== "") {
            if (newPassword.value.length < 8) {
                mwToast("New password must be at least 8 characters.", "warn");
                return;
            }

            if (newPassword.value !== confirmPassword.value) {
                mwToast("New passwords do not match.", "error");
                return;
            }

            if (!currentPassword.value) {
                mwToast("Current password is required to change your password.", "warn");
                return;
            }
        }

        try {
            const fullNameValue = fullNameInput ? fullNameInput.value.trim() : currentUser.full_name;
            const phoneValue = phoneInput ? phoneInput.value.trim() || null : currentUser.phone || null;
            const cityValue = cityInput ? cityInput.value.trim() || null : currentUser.city || null;
            const emergencyContactValue = emergencyContactInput ? emergencyContactInput.value.trim() || null : currentUser.emergency_contact || null;

            // call the api
            const profileResponse = await fetch(window.apiUrl("/api/users/profile"), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    full_name: fullNameValue || currentUser.full_name || null,
                    phone: phoneValue,
                    city: cityValue,
                    certification_number: currentUser.certification_number || null,
                    emergency_contact: emergencyContactValue
                })
            });

            const profileData = await profileResponse.json();
            if (!profileResponse.ok) {
                throw new Error(profileData.message || "Could not update profile.");
            }

            if (newPassword.value) {
                // call the api
                const passwordResponse = await fetch(window.apiUrl("/api/users/password"), {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        currentPassword: currentPassword.value,
                        newPassword: newPassword.value
                    })
                });

                const passwordData = await passwordResponse.json();
                if (!passwordResponse.ok) {
                    throw new Error(passwordData.message || "Could not update password.");
                }
            }

            if (profileData.user) {
                // save value
                localStorage.setItem("mw_user", JSON.stringify(profileData.user));
            }

            mwToast("Profile updated successfully.", "success");
            setTimeout(() => {
                history.back();
            }, 1000);
        } catch (error) {
            console.error(error);
            mwToast(error.message || "Could not update profile.", "error");
        }
    });

    loadProfile();
});
