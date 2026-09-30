const updatesGrid = document.getElementById("updatesGrid");
const lastUpdated = document.getElementById("lastUpdated");

let allUpdates = [];
let currentFilter = "all";


// ==========================================
// FETCH LIVE DATA
// ==========================================

async function loadUpdates() {

    try {

        updatesGrid.innerHTML = `
            <div class="loading">
                FETCHING LIVE INTELLIGENCE...
            </div>
        `;

        const response = await fetch("/api/updates", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const data = await response.json();

        allUpdates = data.updates || [];

        renderUpdates();

        const now = new Date();

        lastUpdated.textContent =
            `UPDATED ${formatTime(now)}`;

    } catch (error) {

        console.error("Update error:", error);

        updatesGrid.innerHTML = `
            <div class="error">
                <strong>CONNECTION ERROR</strong>
                <br><br>
                Unable to retrieve live updates.
                <br>
                Retrying automatically...
            </div>
        `;

        lastUpdated.textContent = "CONNECTION FAILED";
    }
}


// ==========================================
// RENDER
// ==========================================

function renderUpdates() {

    let filtered = allUpdates;

    if (currentFilter !== "all") {

        filtered = allUpdates.filter(
            item => item.category === currentFilter
        );
    }

    if (!filtered.length) {

        updatesGrid.innerHTML = `
            <div class="empty">
                NO UPDATES AVAILABLE FOR THIS CATEGORY.
            </div>
        `;

        return;
    }


    updatesGrid.innerHTML = filtered.map(item => {

        return `
            <article class="card">

                <div class="card-top">

                    <span class="category">
                        ${escapeHTML(item.category.toUpperCase())}
                    </span>

                    <span class="time">
                        ${formatRelativeTime(item.date)}
                    </span>

                </div>


                <h2>
                    ${escapeHTML(item.title)}
                </h2>


                <p>
                    ${escapeHTML(item.description)}
                </p>


                <div class="card-footer">

                    <span class="source">
                        ${escapeHTML(item.source)}
                    </span>

                    ${
                        item.url
                        ? `
                            <a
                                class="open-link"
                                href="${escapeAttribute(item.url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                OPEN ↗
                            </a>
                        `
                        : ""
                    }

                </div>

            </article>
        `;

    }).join("");
}


// ==========================================
// FILTERS
// ==========================================

document.querySelectorAll(".filter").forEach(button => {

    button.addEventListener("click", () => {

        document
            .querySelectorAll(".filter")
            .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        currentFilter = button.dataset.filter;

        renderUpdates();
    });

});


// ==========================================
// TIME
// ==========================================

function formatTime(date) {

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}


function formatRelativeTime(dateString) {

    if (!dateString) {
        return "RECENT";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "RECENT";
    }

    const seconds =
        Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "JUST NOW";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} MIN AGO`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} HR AGO`;
    }

    const days = Math.floor(hours / 24);

    return `${days} DAY${days === 1 ? "" : "S"} AGO`;
}


// ==========================================
// BASIC HTML SAFETY
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}


// ==========================================
// INITIAL LOAD
// ==========================================

loadUpdates();


// ==========================================
// AUTO REFRESH
// ==========================================

// Refresh every 5 minutes.

setInterval(() => {

    loadUpdates();

}, 5 * 60 * 1000);
