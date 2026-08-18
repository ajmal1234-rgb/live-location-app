// Firebase initialize
firebase.initializeApp(firebaseConfig);

// Realtime Database reference
const database = firebase.database();

// Admin password
const ADMIN_PASSWORD = "aju123";

// HTML elements
const loginBox = document.getElementById("loginBox");
const dashboardBox = document.getElementById("dashboardBox");

const adminPasswordInput = document.getElementById("adminPassword");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const usersList = document.getElementById("usersList");
const totalUsers = document.getElementById("totalUsers");

// Map variables
let dashboardMap;
let markers = {};
let latestFirebaseData = null;
let isDashboardStarted = false;

// Login button event
loginBtn.addEventListener("click", function () {
    const enteredPassword = adminPasswordInput.value.trim();

    if (enteredPassword === ADMIN_PASSWORD) {
        loginBox.style.display = "none";
        dashboardBox.style.display = "block";

        if (!isDashboardStarted) {
            initializeDashboardMap();

            setTimeout(function () {
                dashboardMap.invalidateSize();
            }, 500);

            listenToLocations();

            isDashboardStarted = true;
        }
    } else {
        loginError.textContent = "Wrong password.";
    }
});

// Create dashboard map
function initializeDashboardMap() {
    dashboardMap = L.map("dashboardMap").setView([11.1518536, 75.8929863], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(dashboardMap);
}

// Listen live data from Firebase
function listenToLocations() {
    database.ref("locations").on(
        "value",
        function (snapshot) {
            const data = snapshot.val();

            latestFirebaseData = data;

            console.log("Firebase data from dashboard:", data);

            renderDashboard(data, true);
        },
        function (error) {
            console.error("Firebase read error:", error);
            usersList.textContent = "Firebase read error: " + error.message;
        }
    );
}

// Render dashboard data
function renderDashboard(data, moveMapToLatestUser = false) {
    usersList.innerHTML = "";

    if (!data) {
        totalUsers.textContent = "Total users: 0";
        usersList.textContent = "No location data found in Firebase.";
        return;
    }

    const users = Object.values(data);

    const validUsers = users.filter(function (user) {
        return user.latitude !== undefined && user.longitude !== undefined;
    });

    totalUsers.textContent = "Total users: " + validUsers.length;

    if (validUsers.length === 0) {
        usersList.textContent = "Data found, but latitude and longitude missing.";
        return;
    }

    validUsers.forEach(function (user, index) {
        createUserCard(user, index + 1);
        updateMarker(user);
    });

    if (moveMapToLatestUser) {
        const latestUser = validUsers[validUsers.length - 1];

        dashboardMap.setView(
            [Number(latestUser.latitude), Number(latestUser.longitude)],
            16
        );
    }
}

// Create user card
function createUserCard(user, number) {
    const card = document.createElement("div");
    card.className = "user-card";

    const now = Date.now();
    const lastUpdateTime = Number(user.timestamp);

    // 30 seconds-inullil update vannal mathram live aayi kanikkum
    const isRecentlyUpdated = now - lastUpdateTime <= 30000;

    let status = "Last Location";

    if ((user.isSharing === true || user.isSharing === "true") && isRecentlyUpdated) {
        status = "Sharing Live";
    }

    card.innerHTML = `
        <h3>User ${number}</h3>

        <p>
            <strong>Status:</strong>
            <span class="${status === "Sharing Live" ? "online" : "offline"}">
                ${status}
            </span>
        </p>

        <p><strong>Latitude:</strong> ${Number(user.latitude).toFixed(6)}</p>
        <p><strong>Longitude:</strong> ${Number(user.longitude).toFixed(6)}</p>
        <p><strong>Accuracy:</strong> ${user.accuracy} meters</p>
        <p><strong>Last Updated:</strong> ${user.lastUpdated}</p>

        <button class="view-btn" onclick="focusUser(${Number(user.latitude)}, ${Number(user.longitude)})">
            View on Map
        </button>
    `;

    usersList.appendChild(card);
}

// Add or update marker
function updateMarker(user) {
    const latitude = Number(user.latitude);
    const longitude = Number(user.longitude);

    const latLng = [latitude, longitude];
    const markerId = user.userId || latitude + "_" + longitude;

    if (markers[markerId]) {
        markers[markerId].setLatLng(latLng);
    } else {
        markers[markerId] = L.marker(latLng).addTo(dashboardMap);
    }

    const now = Date.now();
    const lastUpdateTime = Number(user.timestamp);
    const isRecentlyUpdated = now - lastUpdateTime <= 30000;

    let status = "Last Location";

    if ((user.isSharing === true || user.isSharing === "true") && isRecentlyUpdated) {
        status = "Sharing Live";
    }

    markers[markerId].bindPopup(`
        <strong>User Location</strong><br>
        Status: ${status}<br>
        Latitude: ${latitude.toFixed(6)}<br>
        Longitude: ${longitude.toFixed(6)}<br>
        Accuracy: ${user.accuracy} meters<br>
        Updated: ${user.lastUpdated}
    `);
}

// Focus user location
function focusUser(latitude, longitude) {
    dashboardMap.setView([latitude, longitude], 16);
}

// Refresh status every 5 seconds
setInterval(function () {
    if (latestFirebaseData && dashboardMap) {
        renderDashboard(latestFirebaseData, false);
    }
}, 5000);