/* ==========================================================
   MarineWatch
   Submit Report
========================================================== */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    // read saved value
    const user = JSON.parse(localStorage.getItem("mw_user") || "{}");

    const nameElement = document.getElementById("topUserName");
    const avatarElement = document.getElementById("topUserAvatar");

    if (nameElement && user.full_name) {
        nameElement.textContent = user.full_name;
    }

    if (avatarElement && user.full_name) {
        const initials = user.full_name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word.charAt(0).toUpperCase())
            .join("");

        avatarElement.textContent = initials || "U";
    }
});

// runs once the page is ready
document.addEventListener("mw:ready", () => {

    const form = document.getElementById("reportForm");

    const mapContainer = document.getElementById("reportMap");

    const latInput = form.lat;

    const lngInput = form.lng;

    const fileInput = document.getElementById("fileInput");

    const uploadZone = document.getElementById("uploadZone");

    const thumbs = document.getElementById("thumbs");

    const gpsButton = document.getElementById("useGps");

    let marker = null;

    let uploadedImages = [];

    /* ----------------------------------
       Create Leaflet Map
    ---------------------------------- */

    const map = L.map("reportMap").setView(
        [23.8859, 45.0792],
        6
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

    /* ----------------------------------
       Select location
    ---------------------------------- */

    map.on("click", (e) => {

        const { lat, lng } = e.latlng;

        if (marker) {

            marker.setLatLng(e.latlng);

        } else {

            marker = L.marker(e.latlng).addTo(map);

        }

        latInput.value = lat.toFixed(6);

        lngInput.value = lng.toFixed(6);

    });

    /* ----------------------------------
       Current GPS
    ---------------------------------- */

    // handle click
    gpsButton.addEventListener("click", () => {

        if (!navigator.geolocation) {

            mwToast(
                "Geolocation is not supported.",
                "error"
            );

            return;

        }

        navigator.geolocation.getCurrentPosition(

            (position) => {

                const lat = position.coords.latitude;

                const lng = position.coords.longitude;

                map.setView([lat, lng], 14);

                if (marker) {

                    marker.setLatLng([lat, lng]);

                } else {

                    marker = L.marker([lat, lng]).addTo(map);

                }

                latInput.value = lat.toFixed(6);

                lngInput.value = lng.toFixed(6);

            },

            () => {

                mwToast(
                    "Unable to get your location.",
                    "warn"
                );

            }

        );

    });
        /* ----------------------------------
       Upload Images
    ---------------------------------- */

    // handle click
    uploadZone.addEventListener("click", () => {

        fileInput.click();

    });

    // handle change
    fileInput.addEventListener("change", () => {

        const newFiles = Array.from(fileInput.files || []);

        // Add the newly picked files to whatever is already selected
        // (instead of replacing it), so photos and videos can be mixed.
        const combined = uploadedImages.concat(newFiles);

        if (combined.length > 3) {
            mwToast("You can upload up to 3 files total (photos and/or videos).", "warn");
        }

        uploadedImages = combined.slice(0, 3);

        // Reset the input so selecting the same file again later still fires "change"
        fileInput.value = "";

        renderImagePreview();

    });

    // remove file at
    function removeFileAt(index) {
        uploadedImages.splice(index, 1);
        renderImagePreview();
    }

    // render image preview
    function renderImagePreview() {

        thumbs.innerHTML = "";

        uploadedImages.forEach((file, index) => {

            const reader = new FileReader();

            reader.onload = function (event) {
                const url = event.target.result;
                let previewElement;

                if (file.type.startsWith('video/')) {
                    previewElement = document.createElement('video');
                    previewElement.controls = true;
                    previewElement.src = url;
                } else {
                    previewElement = document.createElement('img');
                    previewElement.src = url;
                }

                previewElement.className = 'thumb';

                const wrapper = document.createElement('div');
                wrapper.className = 'thumb-wrapper';
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'thumb-remove';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remove';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '2px';
                removeBtn.style.right = '2px';
                // handle click
                removeBtn.addEventListener('click', () => removeFileAt(index));

                wrapper.appendChild(previewElement);
                wrapper.appendChild(removeBtn);
                thumbs.appendChild(wrapper);
            };

            reader.readAsDataURL(file);

        });

    }

    /* ----------------------------------
       Affected Area Buttons
    ---------------------------------- */

    document
        .querySelectorAll(".sev-opt")
        .forEach(option => {

            // handle click
            option.addEventListener("click", () => {

                document
                    .querySelectorAll(".sev-opt")
                    .forEach(item =>
                        item.classList.remove("active")
                    );

                option.classList.add("active");

                const selectedRadio = option.querySelector('input[name="affected_area"]');
                if (selectedRadio) {
                    selectedRadio.checked = true;
                }

            });

        });

    /* ----------------------------------
       Generate Report ID
    ---------------------------------- */

        /* ----------------------------------
       Submit Report
    ---------------------------------- */
form.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!form.checkValidity()) {

        form.reportValidity();

        return;

    }

    if (!latInput.value || !lngInput.value) {

        mwToast(
            "Please select a location on the map.",
            "warn"
        );

        return;

    }

    if (uploadedImages.length === 0) {
        mwToast(
            "Please upload 1 to 3 photos or videos.",
            "warn"
        );
        return;
    }

    // read saved value
    const token = localStorage.getItem("mw_token");

    if (!token) {

        mwToast(
            "Please login first.",
            "error"
        );

        return;

    }

    const formData = new FormData();
    const selectedAffectedArea =
        form.querySelector('input[name="affected_area"]:checked')?.value || "small";

    formData.append(
        "title",
        form.title.value.trim()
    );

    formData.append(
        "pollution_type",
        form.type.value
    );

    formData.append(
        "description",
        form.description.value.trim()
    );

    formData.append(
        "latitude",
        latInput.value
    );

    formData.append(
        "longitude",
        lngInput.value
    );

    formData.append(
        "affected_area",
        selectedAffectedArea
    );

    if (uploadedImages.length > 0) {
        uploadedImages.forEach((file, index) => {
            formData.append('images', file);
        });
    }

    try {

        // call the api
        const response = await fetch(
            window.apiUrl("/api/reports"),
            {

                method: "POST",

                headers: {

                    Authorization: `Bearer ${token}`

                },

                body: formData

            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.message || "Failed to submit report."
            );

        }

        const reportId = data.reportId ? String(data.reportId) : null;

        mwToast(
            data.esi_score !== undefined
                ? `Report submitted successfully! Computed severity: ${data.severity} (ESI ${data.esi_score}/10)`
                : "Report submitted successfully!",
            "success"
        );

        const modal = new bootstrap.Modal(
            document.getElementById("successModal")
        );

        modal.show();

        form.reset();

        thumbs.innerHTML = "";

        uploadedImages = [];

        if (marker) {

            map.removeLayer(marker);

            marker = null;

        }

        latInput.value = "";

        lngInput.value = "";

        document
            .querySelectorAll(".sev-opt")
            .forEach(item =>
                item.classList.remove("active")
            );

        document
            .querySelector(".sev-opt.med")
            .classList.add("active");

    } catch (error) {

        console.error(error);

        mwToast(
            error.message,
            "error"
        );

    }

});

});