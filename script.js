// Firebase initialize
firebase.initializeApp(firebaseConfig);

// Realtime Database reference
const database = firebase.database();

// HTML elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("statusText");

const latitudeText = document.getElementById("latitude");
const longitudeText = document.getElementById("longitude");
const accuracyText = document.getElementById("accuracy");

// Map variables
let map;
let marker;

// Watch position id
let watchId = null;

// Create or get user id from localStorage
let userId = localStorage.getItem("locationUserId");

if (!userId) {
    userId = "user_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    localStorage.setItem("locationUserId", userId);
}

// Button events
startBtn.addEventListener("click", startSharing);
stopBtn.addEventListener("click", stopSharing);

// Start sharing function
function startSharing() {
    statusText.textContent = "Requesting location permission...";

    if (!navigator.geolocation) {
        statusText.textContent = "Geolocation is not supported by your browser.";
        return;
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;

    watchId = navigator.geolocation.watchPosition(
        updateLocation,
        showError,
        {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 5000
        }
    );
}

// Update location function
function updateLocation(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    latitudeText.textContent = latitude.toFixed(6);
    longitudeText.textContent = longitude.toFixed(6);
    accuracyText.textContent = Math.round(accuracy) + " meters";

    statusText.textContent = "Live location sharing is active.";

    const locationData = {
        userId: userId,
        latitude: latitude,
        longitude: longitude,
        accuracy: Math.round(accuracy),
        lastUpdated: new Date().toLocaleString(),
        timestamp: Date.now(),
        isSharing: true
    };

    database.ref("locations/" + userId).set(locationData);

    showMap(latitude, longitude);
}

// Show map on user page
function showMap(latitude, longitude) {
    if (!map) {
        map = L.map("map").setView([latitude, longitude], 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors"
        }).addTo(map);

        marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup("Your live location").openPopup();
    } else {
        map.setView([latitude, longitude], 16);
        marker.setLatLng([latitude, longitude]);
        marker.bindPopup("Your live location").openPopup();
    }
}

// Stop sharing function
function stopSharing() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;

    statusText.textContent = "Location sharing stopped.";

    database.ref("locations/" + userId).update({
        isSharing: false,
        lastUpdated: new Date().toLocaleString(),
        timestamp: Date.now()
    });
}

// Error handling
function showError(error) {
    startBtn.disabled = false;
    stopBtn.disabled = true;

    if (error.code === error.PERMISSION_DENIED) {
        statusText.textContent = "Location permission denied.";
    } 
    else if (error.code === error.POSITION_UNAVAILABLE) {
        statusText.textContent = "Location information is unavailable.";
    } 
    else if (error.code === error.TIMEOUT) {
        statusText.textContent = "Location request timed out. Please turn on device location and try again.";
    } 
    else {
        statusText.textContent = "An unknown error occurred.";
    }
}

// When user closes page, mark as not sharing
window.addEventListener("beforeunload", function () {
    database.ref("locations/" + userId).update({
        isSharing: false,
        lastUpdated: new Date().toLocaleString(),
        timestamp: Date.now()
    });
});