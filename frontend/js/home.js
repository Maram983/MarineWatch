/* MarineWatch - Home Page */

// runs once the page is ready
document.addEventListener("mw:ready", () => {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
        // handle click
        link.addEventListener("click", (event) => {
            const target = document.querySelector(link.getAttribute("href"));

            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
});