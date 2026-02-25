// Correct CDN path for Meteocons animated fill SVGs
const ICON_BASE = "https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/fill/all";

// WMO Weather Code mapping to Meteocons filenames
const WMO_CODES = {
  0:  { label: "Clear Sky",                    icon: "clear-day.svg" },
  1:  { label: "Mainly Clear",                 icon: "mostly-clear-day.svg" },
  2:  { label: "Partly Cloudy",                icon: "partly-cloudy-day.svg" },
  3:  { label: "Overcast",                     icon: "overcast.svg" },
  45: { label: "Foggy",                        icon: "fog.svg" },
  48: { label: "Icy Fog",                      icon: "fog.svg" },
  51: { label: "Light Drizzle",                icon: "drizzle.svg" },
  53: { label: "Drizzle",                      icon: "drizzle.svg" },
  55: { label: "Heavy Drizzle",                icon: "drizzle.svg" },
  61: { label: "Slight Rain",                  icon: "rain.svg" },
  63: { label: "Rain",                         icon: "rain.svg" },
  65: { label: "Heavy Rain",                   icon: "extreme-rain.svg" },
  71: { label: "Slight Snow",                  icon: "snow.svg" },
  73: { label: "Snow",                         icon: "snow.svg" },
  75: { label: "Heavy Snow",                   icon: "extreme-snow.svg" },
  77: { label: "Snow Grains",                  icon: "snow.svg" },
  80: { label: "Slight Showers",               icon: "partly-cloudy-day-rain.svg" },
  81: { label: "Showers",                      icon: "partly-cloudy-day-rain.svg" },
  82: { label: "Violent Showers",              icon: "thunderstorms-day-rain.svg" },
  85: { label: "Snow Showers",                 icon: "partly-cloudy-day-snow.svg" },
  86: { label: "Heavy Snow Showers",           icon: "partly-cloudy-day-snow.svg" },
  95: { label: "Thunderstorm",                 icon: "thunderstorms-day.svg" },
  96: { label: "Thunderstorm + Hail",          icon: "thunderstorms-day-rain.svg" },
  99: { label: "Thunderstorm + Heavy Hail",    icon: "thunderstorms-day-rain.svg" },
};

// Night variants
const WMO_NIGHT = {
  0:  "clear-night.svg",
  1:  "mostly-clear-night.svg",
  2:  "partly-cloudy-night.svg",
  3:  "overcast-night.svg",
  45: "fog-night.svg",
  48: "fog-night.svg",
  51: "drizzle.svg",
  53: "drizzle.svg",
  55: "drizzle.svg",
  61: "rain.svg",
  63: "rain.svg",
  65: "extreme-rain.svg",
  71: "snow.svg",
  73: "snow.svg",
  75: "extreme-snow.svg",
  77: "snow.svg",
  80: "partly-cloudy-night-rain.svg",
  81: "partly-cloudy-night-rain.svg",
  82: "thunderstorms-night-rain.svg",
  85: "partly-cloudy-night-snow.svg",
  86: "partly-cloudy-night-snow.svg",
  95: "thunderstorms-night.svg",
  96: "thunderstorms-night-rain.svg",
  99: "thunderstorms-night-rain.svg",
};

const BG_MAP = {
  0: "sunny",  1: "sunny",  2: "cloudy", 3: "cloudy",
  45: "foggy", 48: "foggy",
  51: "rainy", 53: "rainy", 55: "rainy",
  61: "rainy", 63: "rainy", 65: "rainy",
  71: "snowy", 73: "snowy", 75: "snowy", 77: "snowy",
  80: "rainy", 81: "rainy", 82: "rainy",
  85: "snowy", 86: "snowy",
  95: "thunder", 96: "thunder", 99: "thunder",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Returns the full icon URL
function getIconUrl(code, isDay = true) {
  const nightIcon = WMO_NIGHT[code];
  const dayIcon = WMO_CODES[code]?.icon || "not-available.svg";
  const filename = (!isDay && nightIcon) ? nightIcon : dayIcon;
  return `${ICON_BASE}/${filename}`;
}

// Returns an <img> tag for the icon
function iconImg(code, isDay = true, size = 32) {
  const src = getIconUrl(code, isDay);
  return `<img src="${src}" width="${size}" height="${size}" alt="weather icon" style="display:block;" />`;
}

async function geocode(city) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("City not found");
  return data.results[0];
}

async function fetchWeather(lat, lon, timezone) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,is_day` +
    `&hourly=temperature_2m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&timezone=${encodeURIComponent(timezone)}` +
    `&forecast_days=7`;
  const res = await fetch(url);
  return await res.json();
}

function setBackground(code, isDay) {
  const bgClasses = ["sunny", "cloudy", "rainy", "snowy", "thunder", "foggy", "night", "clear"];
  document.body.classList.remove(...bgClasses);
  if (!isDay) {
    document.body.classList.add("night");
    return;
  }
  const bg = BG_MAP[code] || "clear";
  document.body.classList.add(bg);
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderHourly(hourly) {
  const now = new Date();
  const container = document.getElementById("hourlyScroll");
  container.innerHTML = "";
  let count = 0;
  for (let i = 0; i < hourly.time.length && count < 24; i++) {
    const t = new Date(hourly.time[i]);
    if (t < now) continue;
    const code = hourly.weather_code[i];
    const isDay = hourly.is_day[i] === 1;
    const label =
      count === 0
        ? "Now"
        : t.toLocaleTimeString([], { hour: "numeric", hour12: true });
    container.innerHTML += `
      <div class="hourly-item">
        <span class="hour">${label}</span>
        ${iconImg(code, isDay, 28)}
        <span class="h-temp">${Math.round(hourly.temperature_2m[i])}°</span>
      </div>`;
    count++;
  }
}

function renderWeekly(daily) {
  const container = document.getElementById("weeklyForecast");
  container.innerHTML = "";
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const day = i === 0 ? "Today" : DAYS[date.getDay()];
    const code = daily.weather_code[i];
    container.innerHTML += `
      <div class="weekly-row">
        <span class="day">${day}</span>
        ${iconImg(code, true, 26)}
        <span class="w-temps">
          <span class="w-low">${Math.round(daily.temperature_2m_min[i])}°</span>
          <span class="w-high">${Math.round(daily.temperature_2m_max[i])}°</span>
        </span>
      </div>`;
  }
}

async function loadWeather(city) {
  try {
    document.getElementById("location").textContent = "Loading...";
    document.getElementById("condition").innerHTML = "";
    document.getElementById("tempMain").textContent = "--°";

    const geo = await geocode(city);
    const data = await fetchWeather(geo.latitude, geo.longitude, geo.timezone);

    const cur = data.current;
    const code = cur.weather_code;
    const isDay = cur.is_day === 1;
    const info = WMO_CODES[code] || { label: "Unknown" };

    // Main card
    document.getElementById("location").textContent = `${geo.name}, ${geo.country_code}`;
    document.getElementById("condition").innerHTML = `
      ${iconImg(code, isDay, 22)}
      <span>${info.label}</span>`;
    document.getElementById("tempMain").textContent = `${Math.round(cur.temperature_2m)}°`;
    document.getElementById("tempRange").textContent =
      `H: ${Math.round(data.daily.temperature_2m_max[0])}°  L: ${Math.round(data.daily.temperature_2m_min[0])}°`;

    // Details
    document.getElementById("humidity").textContent   = `${cur.relative_humidity_2m}%`;
    document.getElementById("wind").textContent       = `${Math.round(cur.wind_speed_10m)} km/h`;
    document.getElementById("sunrise").textContent    = formatTime(data.daily.sunrise[0]);
    document.getElementById("sunset").textContent     = formatTime(data.daily.sunset[0]);
    document.getElementById("feelsLike").textContent  = `${Math.round(cur.apparent_temperature)}°`;
    document.getElementById("cloudCover").textContent = `${cur.cloud_cover}%`;

    setBackground(code, isDay);
    renderHourly(data.hourly);
    renderWeekly(data.daily);
  } catch (e) {
    document.getElementById("location").textContent = "City not found 😕";
    document.getElementById("condition").innerHTML = "";
  }
}

// Events
document.getElementById("searchBtn").addEventListener("click", () => {
  const city = document.getElementById("cityInput").value.trim();
  if (city) loadWeather(city);
});

document.getElementById("cityInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const city = e.target.value.trim();
    if (city) loadWeather(city);
  }
});

// Load default city on start
loadWeather("New York");
