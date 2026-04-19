const settingsStorageKey = "homeoverview.settings";

const foscamCamera = {
  host: "192.168.129.0",
  port: 88,
  credentialsKey: "homeoverview.foscam.credentials",
  username: "",
  password: "",
};

const qnectSwitches = [
  { id: "kitchen", name: "Keuken", active: false },
  { id: "bathroom", name: "Badkamer", active: false },
];

const heatingDevices = [
  { id: "daikin-living", brand: "Daikin", name: "Woonkamer", status: "Aan", mode: "Warm", target: 21, inside: "--" },
  { id: "heating-kitchen", brand: "Verwarming", name: "Keuken", status: "Niet gekoppeld", mode: "Auto", target: 20, inside: "--" },
  { id: "heating-bedroom", brand: "Verwarming", name: "Slaapkamer", status: "Niet gekoppeld", mode: "Eco", target: 18, inside: "--" },
  { id: "heating-office", brand: "Verwarming", name: "Bureau", status: "Niet gekoppeld", mode: "Auto", target: 20, inside: "--" },
];

const shutters = [
  { id: "shutter-kitchen", name: "Rolluik keuken", position: "--", status: "Niet gekoppeld" },
  { id: "shutter-back", name: "Rolluik achteraan", position: "--", status: "Niet gekoppeld" },
  { id: "shutter-side", name: "Rolluik zijkant", position: "--", status: "Niet gekoppeld" },
];

const config = {
  weather: {
    latitude: 51.05,
    longitude: 3.72,
    label: "Buiten",
  },
  energy: {
    baseUrl: "https://www.digisteps.be/engie/",
  },
  plants: {
    url: "http://192.168.128.238/",
    ssid: "Schokkaer_EXT",
    label: "Plantbewatering",
  },
  sonoffSwitches: qnectSwitches,
  qnectSwitches,
  heatingDevices,
  shutters,
  cameras: [
    {
      id: "foscam",
      name: "Foscam",
      type: "mjpeg",
      source: foscamCamera,
      url: buildFoscamStreamUrl(foscamCamera),
      status: "Online op 192.168.129.0:88",
    },
  ],
};

applySavedSettings();

const state = {
  targetTemperature: 21,
  climateOn: true,
};

const iconPower = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 2h2v10h-2V2Zm6.78 3.81-1.42 1.42A7 7 0 1 1 7.64 7.23L6.22 5.81a9 9 0 1 0 11.56 0Z"/>
  </svg>
`;

const iconCamera = `
  <svg class="camera-placeholder" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5h10a3 3 0 0 1 3 3v1.4l3.45-2.3A1 1 0 0 1 22 7.93v8.14a1 1 0 0 1-1.55.83L17 14.6V16a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H4Zm13 4.8v.4l3 2V9.8l-3 2Z"/>
  </svg>
`;

function buildFoscamStreamUrl(camera) {
  const credentials = readCameraCredentials(camera);
  if (!credentials.username || !credentials.password) {
    return "";
  }

  const params = new URLSearchParams({
    cmd: "GetMJStream",
    usr: credentials.username,
    pwd: credentials.password,
  });

  return `http://${camera.host}:${camera.port}/cgi-bin/CGIStream.cgi?${params.toString()}`;
}

function readCameraCredentials(camera) {
  if (!camera.credentialsKey) {
    return {
      username: camera.username,
      password: camera.password,
    };
  }

  try {
    const stored = JSON.parse(localStorage.getItem(camera.credentialsKey) || "{}");
    return {
      username: stored.username || camera.username,
      password: stored.password || camera.password,
    };
  } catch (error) {
    return {
      username: camera.username,
      password: camera.password,
    };
  }
}

function saveCameraCredentials(camera, credentials) {
  if (!camera.credentialsKey) {
    return;
  }

  try {
    localStorage.setItem(camera.credentialsKey, JSON.stringify(credentials));
  } catch (error) {
    console.warn("Camera credentials could not be saved locally.", error);
  }
}

function getCameraPageUrl(camera) {
  return `camera.html?id=${encodeURIComponent(camera.id)}`;
}

function findCameraById(id) {
  return config.cameras.find((camera) => camera.id === id) || null;
}

function readDashboardSettings() {
  try {
    return JSON.parse(localStorage.getItem(settingsStorageKey) || "{}");
  } catch (error) {
    console.warn("Dashboard settings could not be read.", error);
    return {};
  }
}

function saveDashboardSettings(settings) {
  localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

function applySavedSettings() {
  const settings = readDashboardSettings();

  if (settings.weather) {
    config.weather.latitude = readNumber(settings.weather.latitude, config.weather.latitude);
    config.weather.longitude = readNumber(settings.weather.longitude, config.weather.longitude);
    config.weather.label = readText(settings.weather.label, config.weather.label);
  }

  if (settings.energy) {
    config.energy.baseUrl = readText(settings.energy.baseUrl, config.energy.baseUrl);
  }

  if (settings.plants) {
    const plantUrl = readText(settings.plants.url, config.plants.url);
    config.plants.url = getUrlHost(plantUrl) === "192.168.1.238" ? "http://192.168.128.238/" : plantUrl;
    config.plants.ssid = readText(settings.plants.ssid, config.plants.ssid);
    config.plants.label = readText(settings.plants.label, config.plants.label);
  }

  if (settings.foscamCamera) {
    foscamCamera.host = readText(settings.foscamCamera.host, foscamCamera.host);
    foscamCamera.port = readNumber(settings.foscamCamera.port, foscamCamera.port);
  }

  replaceCollection(config.qnectSwitches, settings.qnectSwitches, normalizeSwitch);
  replaceCollection(config.heatingDevices, settings.heatingDevices, normalizeHeatingDevice);
  replaceCollection(config.shutters, settings.shutters, normalizeShutter);

  if (Array.isArray(settings.cameras)) {
    const cameras = settings.cameras
      .map(normalizeCamera)
      .filter((camera) => camera.id && camera.name)
      .filter((camera) => !isLegacyEmptyCamera(camera));

    if (cameras.length) {
      config.cameras.length = 0;
      cameras.forEach((camera) => {
        if (camera.id === "foscam") {
          config.cameras.push({
            ...camera,
            source: foscamCamera,
            url: buildFoscamStreamUrl(foscamCamera),
          });
          return;
        }

        config.cameras.push(camera);
      });
    }
  }
}

function replaceCollection(target, items, normalizeItem) {
  if (!Array.isArray(items)) {
    return;
  }

  const normalized = items.map(normalizeItem).filter((item) => item.id && item.name);
  if (!normalized.length) {
    return;
  }

  target.length = 0;
  target.push(...normalized);
}

function normalizeSwitch(item) {
  return {
    id: readText(item?.id, createId(item?.name || "switch")),
    name: readText(item?.name, "Schakelaar"),
    active: Boolean(item?.active),
  };
}

function normalizeHeatingDevice(item) {
  return {
    id: readText(item?.id, createId(item?.name || "heating")),
    brand: readText(item?.brand, "Verwarming"),
    name: readText(item?.name, "Toestel"),
    status: readText(item?.status, "Niet gekoppeld"),
    mode: readText(item?.mode, "Auto"),
    target: readNumber(item?.target, 20),
    inside: readText(item?.inside, "--"),
  };
}

function normalizeShutter(item) {
  return {
    id: readText(item?.id, createId(item?.name || "shutter")),
    name: readText(item?.name, "Rolluik"),
    position: readText(item?.position, "--"),
    status: readText(item?.status, "Niet gekoppeld"),
  };
}

function normalizeCamera(item) {
  return {
    id: readText(item?.id, createId(item?.name || "camera")),
    name: readText(item?.name, "Camera"),
    type: readText(item?.type, "iframe"),
    url: readText(item?.url, ""),
    status: readText(item?.status, "Niet ingesteld"),
  };
}

function isLegacyEmptyCamera(camera) {
  return ["qnect-frontdoor", "cam-2", "cam-3", "cam-4"].includes(camera.id) && !camera.url;
}

function readText(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const text = value.trim();
  return text || fallback;
}

function readNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createId(value) {
  const base = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `item-${Date.now()}`;
}

function updateClock() {
  const now = new Date();
  const day = new Intl.DateTimeFormat("nl-BE", { weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  document.querySelector("#current-day").textContent = capitalize(day);
  document.querySelector("#current-date").textContent = date;
  document.querySelector("#current-time").textContent = time;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function updateWeather() {
  const source = document.querySelector("#temperature-source");
  const temperature = document.querySelector("#current-temperature");
  source.textContent = config.weather.label;

  try {
    const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
    endpoint.searchParams.set("latitude", config.weather.latitude);
    endpoint.searchParams.set("longitude", config.weather.longitude);
    endpoint.searchParams.set("current", "temperature_2m");
    endpoint.searchParams.set("timezone", "Europe/Brussels");

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Weather request failed: ${response.status}`);
    }

    const data = await response.json();
    const value = Number(data.current?.temperature_2m);
    if (Number.isFinite(value)) {
      temperature.innerHTML = `${value.toFixed(1)}&deg;C`;
    }
  } catch (error) {
    temperature.innerHTML = "--&deg;C";
    source.textContent = "Weer niet bereikbaar";
  }
}

function getLocalDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getCurrentHour() {
  return String(new Date().getHours()).padStart(2, "0") + ":00";
}

async function updateEnergy() {
  const today = getLocalDateIso();
  const tomorrow = getLocalDateIso(addDays(new Date(), 1));
  const status = document.querySelector("#energy-status");

  document.querySelector("#energy-date").textContent = today;
  status.textContent = "Dagfile laden...";

  if (window.location.protocol === "file:") {
    renderEnergyError();
    status.textContent = "Open via http://, niet via bestand";
    return;
  }

  try {
    const todayItems = await fetchEnergyDay(today, true);
    let tomorrowItems = [];

    try {
      tomorrowItems = await fetchEnergyDay(tomorrow, false);
    } catch (error) {
      tomorrowItems = [];
    }

    const items = [...todayItems, ...tomorrowItems];
    const dates = tomorrowItems.length ? [today, tomorrow] : [today];
    renderEnergy(items, dates);
    status.textContent = tomorrowItems.length ? "Vandaag + morgen" : "Vandaag";
  } catch (error) {
    renderEnergyError();
  }
}

async function fetchEnergyDay(date, required) {
  const proxyJsonUrl = `energy-proxy.php?format=json&date=${date}`;
  const proxyCsvUrl = `energy-proxy.php?format=csv&date=${date}`;
  const jsonUrl = `${config.energy.baseUrl}downloads.php?action=sonoff_json&date=${date}`;
  const csvUrl = `${config.energy.baseUrl}out/history/engie_${date}.csv`;
  const attempts = [
    () => fetchEnergyJson(proxyJsonUrl, date),
    () => fetchEnergyJson(jsonUrl, date),
    () => fetchEnergyCsv(proxyCsvUrl, date),
    () => fetchEnergyCsv(csvUrl, date),
  ];

  for (const attempt of attempts) {
    try {
      const items = await attempt();
      if (items.length) {
        return items;
      }
    } catch (error) {
      // Try the next source.
    }
  }

  if (required) {
    throw new Error(`Energy day not available: ${date}`);
  }

  return [];
}

async function fetchEnergyJson(url, fallbackDate) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Energy JSON failed: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.items)) {
    throw new Error("Energy JSON does not contain items");
  }

  return data.items
    .map((item) => ({
      date: data.date || fallbackDate,
      time: item.time,
      kwh: Number(item.kwh),
      low: item.top8 === 1 || item.block8 === 1,
    }))
    .filter((item) => item.time && Number.isFinite(item.kwh));
}

async function fetchEnergyCsv(url, fallbackDate) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Energy CSV failed: ${response.status}`);
  }

  const text = await response.text();
  return parseEnergyCsv(text, fallbackDate);
}

function parseEnergyCsv(text, fallbackDate) {
  const rows = text.trim().split(/\r?\n/).slice(1);
  return rows
    .map((row) => {
      const [date, time, mwh, kwh] = row.split(",");
      return {
        date: date || fallbackDate,
        time,
        mwh: Number(mwh),
        kwh: Number(kwh),
        low: false,
      };
    })
    .filter((item) => item.time && Number.isFinite(item.kwh));
}

function renderEnergy(items, dates) {
  if (!items.length) {
    renderEnergyError();
    return;
  }

  const values = items.map((item) => item.kwh);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const today = dates[0];
  const currentTime = getCurrentHour();
  const current = items.find((item) => item.date === today && item.time === currentTime) ?? items[0];

  document.querySelector("#energy-current").textContent = formatKwh(current.kwh);
  document.querySelector("#energy-min").textContent = formatKwh(min);
  document.querySelector("#energy-max").textContent = formatKwh(max);
  document.querySelector("#energy-date").textContent = dates.join(" + ");

  drawEnergyChart(items, min, max, today, currentTime);
}

function renderEnergyError() {
  document.querySelector("#energy-current").textContent = "--";
  document.querySelector("#energy-min").textContent = "--";
  document.querySelector("#energy-max").textContent = "--";
  document.querySelector("#energy-status").textContent = "Dagfile niet bereikbaar";
  clearEnergyChart();
}

function formatKwh(value) {
  return `${(value * 100).toFixed(1)} ct`;
}

function formatEnergyHourRange(time) {
  const [hourText] = String(time || "").split(":");
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) {
    return time || "--";
  }

  const nextHour = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00-${String(nextHour).padStart(2, "0")}:00`;
}

function formatEnergyTooltip(item) {
  return `
    <span>${escapeHtml(formatEnergyHourRange(item.time))}</span>
    <strong>${formatKwh(item.kwh)}/kWh</strong>
  `;
}

function drawEnergyChart(items, min, max, currentDate, currentTime) {
  const grid = document.querySelector("#energy-grid");
  const bars = document.querySelector("#energy-bars");
  const labels = document.querySelector("#energy-labels");
  hideEnergyTooltip();
  clearNode(grid);
  clearNode(bars);
  clearNode(labels);

  const width = 640;
  const height = 220;
  const padding = { top: 18, right: 16, bottom: 34, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const range = Math.max(max - min, 0.001);
  const barGap = items.length > 24 ? 3 : 5;
  const barWidth = chartWidth / items.length - barGap;

  [0, 0.5, 1].forEach((step) => {
    const y = padding.top + chartHeight * step;
    const line = createSvg("line", {
      class: "energy-grid-line",
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
    });
    grid.appendChild(line);
  });

  items.forEach((item, index) => {
    const normalized = (item.kwh - min) / range;
    const barHeight = Math.max(8, normalized * chartHeight);
    const x = padding.left + index * (barWidth + barGap);
    const y = padding.top + chartHeight - barHeight;
    const className = [
      "energy-bar",
      item.low ? "low" : "",
      item.date === currentDate && item.time === currentTime ? "current" : "",
    ].filter(Boolean).join(" ");

    const bar = createSvg("rect", {
      class: className,
      x,
      y,
      width: barWidth,
      height: barHeight,
      rx: 3,
    });
    const title = createSvg("title", {});
    title.textContent = `${item.date} ${formatEnergyHourRange(item.time)}: ${formatKwh(item.kwh)}/kWh`;
    bar.appendChild(title);
    bar.addEventListener("pointermove", (event) => showEnergyTooltip(event, item));
    bar.addEventListener("pointerleave", hideEnergyTooltip);
    bar.addEventListener("focus", (event) => showEnergyTooltip(event, item));
    bar.addEventListener("blur", hideEnergyTooltip);
    bar.setAttribute("tabindex", "0");
    bars.appendChild(bar);

    const startsNewDay = index > 0 && item.date !== items[index - 1].date;
    if (startsNewDay) {
      const line = createSvg("line", {
        class: "energy-day-line",
        x1: x - barGap,
        y1: padding.top,
        x2: x - barGap,
        y2: padding.top + chartHeight,
      });
      grid.appendChild(line);
    }

    if (index % 6 === 0 || startsNewDay || index === items.length - 1) {
      const label = createSvg("text", {
        class: "energy-axis-label",
        x: x + barWidth / 2,
        y: height - 12,
        "text-anchor": "middle",
      });
      label.textContent = startsNewDay ? "morgen" : item.time.slice(0, 2);
      labels.appendChild(label);
    }
  });
}

function showEnergyTooltip(event, item) {
  const tooltip = document.querySelector("#energy-tooltip");
  const chartWrap = document.querySelector(".energy-chart-wrap");
  const bounds = chartWrap.getBoundingClientRect();
  const eventX = event.clientX ?? bounds.left + bounds.width / 2;
  const eventY = event.clientY ?? bounds.top + bounds.height / 2;
  const x = Math.min(Math.max(eventX - bounds.left, 70), bounds.width - 70);
  const y = Math.min(Math.max(eventY - bounds.top, 48), bounds.height - 8);

  tooltip.innerHTML = formatEnergyTooltip(item);
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add("visible");
}

function hideEnergyTooltip() {
  const tooltip = document.querySelector("#energy-tooltip");
  if (tooltip) {
    tooltip.classList.remove("visible");
  }
}

function clearEnergyChart() {
  hideEnergyTooltip();
  clearNode(document.querySelector("#energy-grid"));
  clearNode(document.querySelector("#energy-bars"));
  clearNode(document.querySelector("#energy-labels"));
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function createSvg(tagName, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

function renderSonoffSwitches() {
  const container = document.querySelector("#sonoff-switches");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  config.sonoffSwitches.forEach((item) => {
    const button = document.createElement("button");
    button.className = `switch-button${item.active ? " active" : ""}`;
    button.type = "button";
    button.dataset.id = item.id;
    button.innerHTML = `
      <span>
        <span class="switch-name">${item.name}</span>
        <span class="switch-state">${item.active ? "Aan" : "Uit"}</span>
      </span>
      ${iconPower}
    `;
    button.addEventListener("click", () => {
      item.active = !item.active;
      renderSonoffSwitches();
      // Koppel hier later Home Assistant of eWeLink aan.
    });
    container.appendChild(button);
  });
}

function renderCameras() {
  const container = document.querySelector("#camera-grid");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  config.cameras.forEach((camera) => {
    if (camera.source) {
      camera.url = buildFoscamStreamUrl(camera.source);
    }

    const tile = document.createElement("article");
    tile.className = `camera-tile${camera.url ? "" : " setup"}`;
    tile.tabIndex = 0;
    tile.setAttribute("role", "link");
    tile.setAttribute("aria-label", `${camera.name} openen`);

    const stream = camera.url
      ? renderCameraStream(camera)
      : `<div class="camera-view">${iconCamera}</div>`;
    const statusText = camera.url ? "Live" : camera.status || "Niet ingesteld";

    tile.innerHTML = `
      ${stream}
      <div class="camera-label">
        <strong>${camera.name}</strong>
        <span>${statusText}</span>
      </div>
      <div class="camera-tile-actions">
        <a class="text-link compact" href="${escapeHtml(getCameraPageUrl(camera))}">Open pagina</a>
      </div>
    `;

    bindCameraTileLink(tile, camera);

    container.appendChild(tile);
  });
}

function renderWebcamOverview() {
  const container = document.querySelector("#webcam-overview-grid");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  config.cameras.forEach((camera) => {
    if (camera.source) {
      camera.url = buildFoscamStreamUrl(camera.source);
    }

    const tile = document.createElement("article");
    tile.className = `overview-card camera-tile${camera.url ? "" : " setup"}`;
    tile.tabIndex = 0;
    tile.setAttribute("role", "link");
    tile.setAttribute("aria-label", `${camera.name} openen`);
    const stream = camera.url
      ? renderCameraStream(camera)
      : `<div class="camera-view overview-camera-view">${iconCamera}</div>`;
    const statusText = camera.url ? "Live" : camera.status || "Niet ingesteld";

    tile.innerHTML = `
      ${stream}
      <div class="camera-label">
        <strong>${camera.name}</strong>
        <span>${statusText}</span>
      </div>
      <div class="camera-tile-actions">
        <a class="text-link compact" href="${escapeHtml(getCameraPageUrl(camera))}">Open pagina</a>
      </div>
    `;

    bindCameraTileLink(tile, camera);

    container.appendChild(tile);
  });
}

function bindCameraTileLink(tile, camera) {
  const openCameraPage = () => {
    window.location.href = getCameraPageUrl(camera);
  };

  tile.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) {
      return;
    }

    openCameraPage();
  });

  tile.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openCameraPage();
  });
}

function renderCameraStream(camera) {
  const isImageStream = camera.type === "mjpeg"
    || camera.type === "image"
    || /\.(jpg|jpeg|png|gif|webp|mjpg|mjpeg)(\?|$)/i.test(camera.url)
    || /CGIStream\.cgi/i.test(camera.url);

  if (isImageStream) {
    return `<div class="camera-view"><img src="${camera.url}" alt="${camera.name}"></div>`;
  }

  return `<div class="camera-view"><iframe title="${camera.name}" src="${camera.url}" loading="lazy"></iframe></div>`;
}

function getCameraStatus(camera) {
  const text = camera.url ? "Live" : camera.status || "Geen beeld";
  return {
    text,
    isOnline: Boolean(camera.url) || /^online\b/i.test(text),
    hasStream: Boolean(camera.url),
  };
}

function renderCameraDetailPlaceholder(camera) {
  return `
    <div class="camera-detail-empty">
      ${iconCamera}
      <strong>${escapeHtml(camera.source ? "Login nodig voor beeld" : "Geen beeld ingesteld")}</strong>
      ${camera.source ? `<button class="secondary-button compact" type="button" data-action="camera-login">Login</button>` : ""}
    </div>
  `;
}

function renderCameraDetailPage() {
  const container = document.querySelector("#camera-detail-panel");
  if (!container) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const selectedId = params.get("id") || config.cameras[0]?.id || "";
  const camera = findCameraById(selectedId);

  if (!camera) {
    container.innerHTML = `
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Camera</p>
          <h1>Niet gevonden</h1>
        </div>
        <a class="text-link" href="webcams.html">Terug</a>
      </div>
      <div class="camera-detail-empty">${iconCamera}</div>
    `;
    return;
  }

  if (camera.source) {
    camera.url = buildFoscamStreamUrl(camera.source);
  }

  const stream = camera.url
    ? renderCameraStream(camera)
    : renderCameraDetailPlaceholder(camera);
  const status = getCameraStatus(camera);
  const streamText = camera.url ? "Live" : camera.source ? "Login nodig" : "Niet ingesteld";
  const cameraAddress = camera.source ? `${camera.source.host}:${camera.source.port}` : getUrlHost(camera.url || "");

  container.innerHTML = `
    <div class="panel-heading camera-detail-heading">
      <div>
        <p class="eyebrow">Camera</p>
        <h1>${escapeHtml(camera.name)}</h1>
      </div>
      <div class="camera-detail-actions">
        ${camera.source ? `<button class="secondary-button compact" type="button" data-action="camera-login">Login</button>` : ""}
        <a class="text-link" href="webcams.html">Alle camera's</a>
        <a class="primary-link" href="beheer.html#settings-cameras">Beheer</a>
      </div>
    </div>
    <div class="camera-detail-layout">
      <div class="camera-detail-stage">
        ${stream}
      </div>
      <aside class="camera-detail-info">
        <dl>
          <div>
            <dt>Apparaat</dt>
            <dd><span class="camera-status-dot ${status.isOnline ? "online" : "offline"}"></span>${escapeHtml(status.text)}</dd>
          </div>
          <div>
            <dt>Beeld</dt>
            <dd><span class="camera-status-dot ${status.hasStream ? "online" : "offline"}"></span>${escapeHtml(streamText)}</dd>
          </div>
          <div>
            <dt>Adres</dt>
            <dd>${escapeHtml(cameraAddress || "Niet ingesteld")}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>${escapeHtml(camera.id)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>${escapeHtml(camera.type || "iframe")}</dd>
          </div>
          <div>
            <dt>URL</dt>
            <dd>${escapeHtml(camera.url || "Geen stream-URL zonder login")}</dd>
          </div>
        </dl>
      </aside>
    </div>
  `;

  container.querySelectorAll("[data-action='camera-login']").forEach((button) => {
    button.addEventListener("click", () => {
      if (camera.source) {
        openCameraLoginDialog(camera.source);
      }
    });
  });
}

function bindClimateControls() {
  const target = document.querySelector("#target-temperature");
  const climatePower = document.querySelector("[data-action='toggle-climate']");
  if (!target || !climatePower) {
    return;
  }

  function updateTarget() {
    target.textContent = state.targetTemperature.toFixed(1);
    climatePower.classList.toggle("active", state.climateOn);
  }

  document.querySelector("[data-action='temp-down']").addEventListener("click", () => {
    state.targetTemperature = Math.max(16, state.targetTemperature - 0.5);
    updateTarget();
  });

  document.querySelector("[data-action='temp-up']").addEventListener("click", () => {
    state.targetTemperature = Math.min(30, state.targetTemperature + 0.5);
    updateTarget();
  });

  climatePower.addEventListener("click", () => {
    state.climateOn = !state.climateOn;
    updateTarget();
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-mode]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  updateTarget();
}

function renderHeatingOverview() {
  const container = document.querySelector("#heating-overview-grid");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  config.heatingDevices.forEach((device) => {
    const card = document.createElement("article");
    card.className = "overview-card heating-card";
    card.innerHTML = `
      <div class="overview-card-heading">
        <div>
          <p class="eyebrow">${device.brand}</p>
          <h2>${device.name}</h2>
        </div>
        <span class="status-pill">${device.status}</span>
      </div>
      <div class="overview-temp">${device.target.toFixed(1)}<small>&deg;C</small></div>
      <div class="overview-meta">
        <span>Modus <strong>${device.mode}</strong></span>
        <span>Binnen <strong>${device.inside}&deg;C</strong></span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSwitchOverview() {
  const container = document.querySelector("#switch-overview-grid");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  config.qnectSwitches.forEach((item) => {
    const button = document.createElement("button");
    button.className = `switch-button overview-switch${item.active ? " active" : ""}`;
    button.type = "button";
    button.dataset.id = item.id;
    button.innerHTML = `
      <span>
        <span class="switch-name">${item.name}</span>
        <span class="switch-state">${item.active ? "Aan" : "Uit"}</span>
      </span>
      ${iconPower}
    `;
    button.addEventListener("click", () => {
      item.active = !item.active;
      renderSwitchOverview();
    });
    container.appendChild(button);
  });
}

function renderShutterOverview() {
  const container = document.querySelector("#shutter-overview-grid");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  config.shutters.forEach((item) => {
    const card = document.createElement("article");
    card.className = "overview-card shutter-card";
    card.innerHTML = `
      <div class="overview-card-heading">
        <div>
          <p class="eyebrow">Rolluik</p>
          <h2>${item.name}</h2>
        </div>
        <span class="status-pill">${item.status}</span>
      </div>
      <div class="shutter-position">${item.position}</div>
      <div class="shutter-actions">
        <button type="button" aria-label="${item.name} openen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 5 7 7-1.4 1.4L13 8.82V20h-2V8.82l-4.6 4.58L5 12l7-7Z"/></svg>
          Open
        </button>
        <button type="button" aria-label="${item.name} stoppen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7V7Z"/></svg>
          Stop
        </button>
        <button type="button" aria-label="${item.name} sluiten">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-7-7 1.4-1.4L11 15.18V4h2v11.18l4.6-4.58L19 12l-7 7Z"/></svg>
          Dicht
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function bindCameraLoginDialog() {
  const dialog = document.querySelector("#camera-login-dialog");
  const form = document.querySelector("#camera-login-form");
  const close = document.querySelector("#camera-login-close");
  const username = document.querySelector("#camera-username");
  const password = document.querySelector("#camera-password");
  if (!dialog || !form || !close || !username || !password) {
    return;
  }
  let activeCamera = null;

  window.openCameraLoginDialog = (camera) => {
    activeCamera = camera;
    const credentials = readCameraCredentials(camera);
    username.value = credentials.username;
    password.value = "";
    dialog.showModal();
    username.focus();
  };

  close.addEventListener("click", () => dialog.close());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeCamera) {
      dialog.close();
      return;
    }

    saveCameraCredentials(activeCamera, {
      username: username.value.trim(),
      password: password.value,
    });
    dialog.close();
    renderCameras();
    renderWebcamOverview();
    renderCameraDetailPage();
  });
}

function renderPlantSystemPage() {
  const container = document.querySelector("#plants-panel");
  if (!container) {
    return;
  }

  const url = config.plants.url;
  const ssid = config.plants.ssid;
  const label = config.plants.label;
  container.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Planten</p>
        <h1>${escapeHtml(label)}</h1>
      </div>
      <a class="primary-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open systeem</a>
    </div>
    <div class="plants-layout">
      <article class="plants-info">
        <h2>Watergeefsysteem</h2>
        <p>Dit systeem staat op <strong>${escapeHtml(url)}</strong>.</p>
        <p>Bereikbaar wanneer deze tablet of pc verbonden is met wifi-netwerk <strong>${escapeHtml(ssid)}</strong>.</p>
        <p>Als het venster hieronder leeg blijft, open het systeem via de knop. Sommige toestellen blokkeren weergave binnen een dashboard.</p>
      </article>
      <div class="plants-frame-wrap">
        <iframe title="${escapeHtml(label)}" src="${escapeHtml(url)}" loading="lazy"></iframe>
      </div>
    </div>
  `;
}

function getUrlHost(value) {
  try {
    return new URL(value).host;
  } catch (error) {
    return value || "--";
  }
}

function renderNetworkNode(item) {
  return `
    <article class="network-node ${escapeHtml(item.type)}">
      <div class="network-node-top">
        <span class="network-type">${escapeHtml(item.typeLabel)}</span>
        <strong>${escapeHtml(item.name)}</strong>
      </div>
      <dl>
        <div>
          <dt>IP</dt>
          <dd>${escapeHtml(item.ip)}</dd>
        </div>
        <div>
          <dt>Info</dt>
          <dd>${escapeHtml(item.info)}</dd>
        </div>
      </dl>
    </article>
  `;
}

function renderNetworkPage() {
  const container = document.querySelector("#network-panel");
  if (!container) {
    return;
  }

  const modem = {
    name: "Internet Box",
    ip: "192.168.128.1",
    dns: "192.168.128.1",
    dhcp: "Actief",
    dhcpRange: "192.168.129.0 - 192.168.129.254",
    activeSubnet: "255.255.254.0",
    configuredSubnet: "255.255.252.0",
    activeRange: "192.168.128.0 - 192.168.129.255",
    mac: "64:fa:2b:cb:e5:f2",
    hostname: "mymodem.home",
  };

  const devices = [
    {
      type: "server",
      typeLabel: "Dashboard",
      name: "HomeOverview",
      ip: "192.168.129.3:8123",
      info: "Deze pc, poort 8123 open",
    },
    {
      type: "server",
      typeLabel: "VM",
      name: "Home Assistant",
      ip: "192.168.129.3:8124",
      info: "Niet open in scan",
    },
    {
      type: "camera",
      typeLabel: "Camera",
      name: "Foscam",
      ip: `${foscamCamera.host}:${foscamCamera.port}`,
      info: "Poorten 88 en 443 open",
    },
    {
      type: "media",
      typeLabel: "TV",
      name: "Tv in woonkamer",
      ip: "192.168.128.4",
      info: "Antwoordt op ping",
    },
    {
      type: "printer",
      typeLabel: "HP",
      name: "HP690FC5",
      ip: "192.168.129.8",
      info: "Poorten 80, 443, 8080 open",
    },
    {
      type: "storage",
      typeLabel: "NAS",
      name: "SchokkaertDrive",
      ip: "192.168.1.59",
      info: "Poorten 80, 443, 554, 5000, 5001 open",
    },
    {
      type: "plant",
      typeLabel: "IoT",
      name: config.plants.label,
      ip: getUrlHost(config.plants.url),
      info: "Niet gevonden in scan",
    },
    {
      type: "unknown",
      typeLabel: "Onbekend",
      name: "Host 192.168.128.2",
      ip: "192.168.128.2",
      info: "Alleen ARP/DNS",
    },
    {
      type: "unknown",
      typeLabel: "Onbekend",
      name: "Host 192.168.129.5",
      ip: "192.168.129.5",
      info: "Alleen ARP/DNS",
    },
    {
      type: "unknown",
      typeLabel: "Onbekend",
      name: "Host 192.168.129.7",
      ip: "192.168.129.7",
      info: "Alleen ARP/DNS",
    },
  ];

  container.innerHTML = `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Netwerk</p>
        <h1>Visueel overzicht</h1>
      </div>
      <div class="network-actions">
        <button class="secondary-button compact" type="button" data-action="refresh-network">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.45 10.92l-1.85-.77A6 6 0 1 1 16.24 7.76L13 11h8V3l-3.35 3.35Z"/></svg>
          Ververs
        </button>
        <a class="primary-link" href="beheer.html">Beheer</a>
      </div>
    </div>
    <div class="network-layout">
      <section class="network-map" aria-label="Netwerkschema">
        <div class="network-root">
          ${renderNetworkNode({
            type: "gateway",
            typeLabel: "Modem",
            name: modem.name,
            ip: modem.ip,
            info: `${modem.hostname}, DNS + gateway`,
          })}
        </div>
        <div class="network-line vertical"></div>
        <div class="network-infra-row">
          ${renderNetworkNode({
            type: "lan",
            typeLabel: "LAN",
            name: "Prive netwerk",
            ip: "192.168.128.0/23",
            info: "Actief op deze pc",
          })}
          ${renderNetworkNode({
            type: "repeater",
            typeLabel: "Repeater",
            name: "WiFiBoosterV2",
            ip: "192.168.128.3",
            info: "Gevonden via DNS",
          })}
          ${renderNetworkNode({
            type: "repeater",
            typeLabel: "RE190",
            name: "TP-Link RE190",
            ip: "192.168.128.135",
            info: "Niet gevonden in scan",
          })}
        </div>
        <div class="network-line fan"></div>
        <div class="network-device-grid">
          ${devices.map(renderNetworkNode).join("")}
        </div>
      </section>
      <aside class="network-details" aria-label="Netwerkadressen">
        <h2>Modem</h2>
        <dl>
          <div>
            <dt>Naam</dt>
            <dd>${modem.name}</dd>
          </div>
          <div>
            <dt>Hostnaam</dt>
            <dd>${modem.hostname}</dd>
          </div>
          <div>
            <dt>IP / gateway</dt>
            <dd>${modem.ip}</dd>
          </div>
          <div>
            <dt>DNS</dt>
            <dd>${modem.dns}</dd>
          </div>
          <div>
            <dt>MAC</dt>
            <dd>${modem.mac}</dd>
          </div>
          <div>
            <dt>DHCP</dt>
            <dd>${modem.dhcp}</dd>
          </div>
          <div>
            <dt>DHCP-pool modem</dt>
            <dd>${modem.dhcpRange}</dd>
          </div>
          <div>
            <dt>Actief subnet</dt>
            <dd>${modem.activeSubnet}</dd>
          </div>
          <div>
            <dt>Subnet modemscherm</dt>
            <dd>${modem.configuredSubnet}</dd>
          </div>
          <div>
            <dt>Actief bereik</dt>
            <dd>${modem.activeRange}</dd>
          </div>
          <div>
            <dt>Gevonden repeater</dt>
            <dd>192.168.128.3</dd>
          </div>
          <div>
            <dt>Plantbewatering</dt>
            <dd>${escapeHtml(getUrlHost(config.plants.url))} niet gevonden</dd>
          </div>
          <div>
            <dt>Oud subnet</dt>
            <dd>192.168.1.59 SchokkaertDrive</dd>
          </div>
        </dl>
      </aside>
    </div>
  `;

  bindNetworkControls();
}

function bindNetworkControls() {
  const refresh = document.querySelector("[data-action='refresh-network']");
  if (!refresh) {
    return;
  }

  refresh.addEventListener("click", () => window.location.reload());
}

function renderSettingsAdmin(message = "") {
  const form = document.querySelector("#settings-form");
  if (!form) {
    return;
  }

  form.innerHTML = `
    <div class="settings-toolbar">
      <div>
        <p class="eyebrow">Beheer</p>
        <h1 id="settings-title">Instellingen</h1>
      </div>
      <div class="settings-actions">
        <button class="secondary-button" type="button" data-action="reset-settings">Standaardwaarden</button>
        <button class="primary-button compact" type="submit">Opslaan</button>
      </div>
    </div>
    <p class="settings-message${message ? " visible" : ""}" id="settings-message">${escapeHtml(message)}</p>
    <div class="settings-grid">
      <aside class="settings-menu" aria-label="Instellingen menu">
        <a href="#settings-general">Algemeen</a>
        <a href="#settings-plants">Planten</a>
        <a href="#settings-cameras">Camera's</a>
        <a href="#settings-switches">Qnect</a>
        <a href="#settings-heating">Verwarming</a>
        <a href="#settings-shutters">Rolluiken</a>
      </aside>
      <div class="settings-content">
        ${renderGeneralSettings()}
        ${renderPlantSettings()}
        ${renderCameraSettings()}
        ${renderCollectionSettings("settings-switches", "Qnect", "Schakelaars", "qnectSwitches", config.qnectSwitches, [
          { field: "id", label: "ID" },
          { field: "name", label: "Naam" },
          { field: "active", label: "Start actief", type: "checkbox" },
        ])}
        ${renderCollectionSettings("settings-heating", "Verwarming", "Toestellen", "heatingDevices", config.heatingDevices, [
          { field: "id", label: "ID" },
          { field: "brand", label: "Merk" },
          { field: "name", label: "Naam" },
          { field: "status", label: "Status" },
          { field: "mode", label: "Modus" },
          { field: "target", label: "Doeltemperatuur", type: "number", step: "0.5" },
          { field: "inside", label: "Binnentemperatuur" },
        ])}
        ${renderCollectionSettings("settings-shutters", "Rolluiken", "Sturingen", "shutters", config.shutters, [
          { field: "id", label: "ID" },
          { field: "name", label: "Naam" },
          { field: "position", label: "Positie" },
          { field: "status", label: "Status" },
        ])}
      </div>
    </div>
  `;

  bindSettingsAdmin(form);
}

function renderGeneralSettings() {
  return `
    <section class="settings-section" id="settings-general">
      <div class="settings-section-heading">
        <div>
          <p class="eyebrow">Algemeen</p>
          <h2>Dashboardbronnen</h2>
        </div>
      </div>
      <div class="settings-fields">
        ${renderField("Weer latitude", "weather.latitude", config.weather.latitude, { type: "number", step: "0.000001" })}
        ${renderField("Weer longitude", "weather.longitude", config.weather.longitude, { type: "number", step: "0.000001" })}
        ${renderField("Weer label", "weather.label", config.weather.label)}
        ${renderField("Engie basis-URL", "energy.baseUrl", config.energy.baseUrl, { type: "url" })}
        ${renderField("Foscam IP/host", "foscamCamera.host", foscamCamera.host)}
        ${renderField("Foscam poort", "foscamCamera.port", foscamCamera.port, { type: "number", step: "1" })}
      </div>
    </section>
  `;
}

function renderPlantSettings() {
  return `
    <section class="settings-section" id="settings-plants">
      <div class="settings-section-heading">
        <div>
          <p class="eyebrow">Planten</p>
          <h2>Watergeefsysteem</h2>
        </div>
      </div>
      <p class="settings-hint">Dit systeem is alleen bereikbaar wanneer de tablet of pc verbonden is met het juiste wifi-netwerk.</p>
      <div class="settings-fields">
        ${renderField("Plantensysteem URL", "plants.url", config.plants.url, { type: "url" })}
        ${renderField("Vereist wifi-netwerk", "plants.ssid", config.plants.ssid)}
        ${renderField("Naam in dashboard", "plants.label", config.plants.label)}
      </div>
    </section>
  `;
}

function renderCameraSettings() {
  const fields = [
    { field: "id", label: "ID" },
    { field: "name", label: "Naam" },
    { field: "type", label: "Type" },
    { field: "url", label: "URL" },
  ];

  return `
    <section class="settings-section" id="settings-cameras">
      <div class="settings-section-heading">
        <div>
          <p class="eyebrow">Camera's</p>
          <h2>Streams</h2>
        </div>
        <button class="secondary-button" type="button" data-action="add-row" data-collection="cameras">Toevoegen</button>
      </div>
      <p class="settings-hint">Online gevonden: Foscam op 192.168.129.0:88. De Foscam-stream gebruikt de host en poort uit Algemeen. De login blijft apart lokaal bewaard via de camera-login.</p>
      <div class="settings-list camera-settings-list" data-list="cameras">
        ${config.cameras.map((item) => renderCameraSettingsRow(item, fields)).join("")}
      </div>
    </section>
  `;
}

function renderCollectionSettings(id, eyebrow, title, collection, items, fields, hint = "") {
  return `
    <section class="settings-section" id="${id}">
      <div class="settings-section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(eyebrow)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <button class="secondary-button" type="button" data-action="add-row" data-collection="${collection}">Toevoegen</button>
      </div>
      ${hint ? `<p class="settings-hint">${escapeHtml(hint)}</p>` : ""}
      <div class="settings-list" data-list="${collection}">
        ${items.map((item) => renderSettingsRow(collection, item, fields)).join("")}
      </div>
    </section>
  `;
}

function renderSettingsRow(collection, item, fields) {
  return `
    <article class="settings-row" data-collection="${collection}">
      <div class="settings-row-header">
        <strong>${escapeHtml(item.name || item.id || "Nieuw item")}</strong>
        <button class="danger-button" type="button" data-action="remove-row">Verwijder</button>
      </div>
      <div class="settings-fields compact-fields">
        ${fields.map((field) => renderRowField(item, field)).join("")}
      </div>
    </article>
  `;
}

function renderCameraSettingsRow(item, fields) {
  const camera = item.source
    ? { ...item, url: buildFoscamStreamUrl(item.source) }
    : item;

  return `
    <article class="settings-row camera-settings-row" data-collection="cameras">
      <div class="camera-settings-preview">
        ${renderCameraSettingsPreview(camera)}
        <div class="camera-settings-meta">
          ${renderCameraStatusDot(camera)}
          <div>
            <strong>${escapeHtml(item.name || item.id || "Camera")}</strong>
            <span>${escapeHtml(camera.url || item.status || "Geen beeld")}</span>
          </div>
        </div>
      </div>
      <button class="danger-button" type="button" data-action="remove-row">Verwijder</button>
      <div class="camera-settings-fields">
        ${fields.map((field) => renderRowField(item, field)).join("")}
      </div>
      <input type="hidden" data-field="status" value="${escapeHtml(item.status || "")}">
    </article>
  `;
}

function renderCameraStatusDot(camera) {
  const status = getCameraStatus(camera);
  return `
    <span
      class="camera-status-dot ${status.isOnline ? "online" : "offline"}"
      title="${escapeHtml(status.text)}"
      aria-label="${escapeHtml(status.text)}"
    ></span>
  `;
}

function renderCameraSettingsPreview(camera) {
  if (!camera.url) {
    return `<div class="camera-settings-thumb">${iconCamera}</div>`;
  }

  const isImageStream = camera.type === "mjpeg"
    || camera.type === "image"
    || /\.(jpg|jpeg|png|gif|webp|mjpg|mjpeg)(\?|$)/i.test(camera.url)
    || /CGIStream\.cgi/i.test(camera.url);

  if (isImageStream) {
    return `
      <div class="camera-settings-thumb">
        <img src="${escapeHtml(camera.url)}" alt="${escapeHtml(camera.name)}">
      </div>
    `;
  }

  return `
    <div class="camera-settings-thumb">
      <iframe title="${escapeHtml(camera.name)}" src="${escapeHtml(camera.url)}" loading="lazy"></iframe>
    </div>
  `;
}

function renderField(label, setting, value, options = {}) {
  return `
    <label class="settings-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="${escapeHtml(options.type || "text")}"
        data-setting="${escapeHtml(setting)}"
        value="${escapeHtml(String(value ?? ""))}"
        ${options.step ? `step="${escapeHtml(options.step)}"` : ""}
      >
    </label>
  `;
}

function renderRowField(item, field) {
  const value = item[field.field] ?? "";
  if (field.type === "checkbox") {
    return `
      <label class="settings-field checkbox-field">
        <input type="checkbox" data-field="${escapeHtml(field.field)}" ${value ? "checked" : ""}>
        <span>${escapeHtml(field.label)}</span>
      </label>
    `;
  }

  return `
    <label class="settings-field">
      <span>${escapeHtml(field.label)}</span>
      <input
        type="${escapeHtml(field.type || "text")}"
        data-field="${escapeHtml(field.field)}"
        value="${escapeHtml(String(value))}"
        ${field.step ? `step="${escapeHtml(field.step)}"` : ""}
      >
    </label>
  `;
}

function bindSettingsAdmin(form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const settings = collectDashboardSettings(form);
    saveDashboardSettings(settings);
    applySavedSettings();
    renderSettingsAdmin("Instellingen bewaard. Open het dashboard opnieuw om alles meteen te zien.");
  });

  form.querySelector("[data-action='reset-settings']").addEventListener("click", () => {
    localStorage.removeItem(settingsStorageKey);
    window.location.reload();
  });

  form.querySelectorAll("[data-action='add-row']").forEach((button) => {
    button.addEventListener("click", () => {
      addSettingsRow(button.dataset.collection);
    });
  });

  form.querySelectorAll("[data-action='remove-row']").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".settings-row")?.remove();
    });
  });
}

function addSettingsRow(collection) {
  const list = document.querySelector(`[data-list='${collection}']`);
  if (!list) {
    return;
  }

  const item = {
    id: `${collection}-${Date.now()}`,
    name: "Nieuw item",
    type: collection === "cameras" ? "iframe" : undefined,
    url: "",
    status: "Niet ingesteld",
    brand: collection === "heatingDevices" ? "Verwarming" : undefined,
    mode: collection === "heatingDevices" ? "Auto" : undefined,
    target: collection === "heatingDevices" ? 20 : undefined,
    inside: collection === "heatingDevices" ? "--" : undefined,
    position: collection === "shutters" ? "--" : undefined,
    active: false,
  };
  const fields = getSettingsFields(collection);
  list.insertAdjacentHTML(
    "beforeend",
    collection === "cameras" ? renderCameraSettingsRow(item, fields) : renderSettingsRow(collection, item, fields)
  );
  const row = list.lastElementChild;
  row.querySelector("[data-action='remove-row']").addEventListener("click", () => row.remove());
}

function getSettingsFields(collection) {
  const fields = {
    cameras: [
      { field: "id", label: "ID" },
      { field: "name", label: "Naam" },
      { field: "type", label: "Type" },
      { field: "url", label: "URL" },
    ],
    qnectSwitches: [
      { field: "id", label: "ID" },
      { field: "name", label: "Naam" },
      { field: "active", label: "Start actief", type: "checkbox" },
    ],
    heatingDevices: [
      { field: "id", label: "ID" },
      { field: "brand", label: "Merk" },
      { field: "name", label: "Naam" },
      { field: "status", label: "Status" },
      { field: "mode", label: "Modus" },
      { field: "target", label: "Doeltemperatuur", type: "number", step: "0.5" },
      { field: "inside", label: "Binnentemperatuur" },
    ],
    shutters: [
      { field: "id", label: "ID" },
      { field: "name", label: "Naam" },
      { field: "position", label: "Positie" },
      { field: "status", label: "Status" },
    ],
  };
  return fields[collection] || [];
}

function collectDashboardSettings(form) {
  return {
    weather: {
      latitude: getSettingValue(form, "weather.latitude"),
      longitude: getSettingValue(form, "weather.longitude"),
      label: getSettingValue(form, "weather.label"),
    },
    energy: {
      baseUrl: getSettingValue(form, "energy.baseUrl"),
    },
    plants: {
      url: getSettingValue(form, "plants.url"),
      ssid: getSettingValue(form, "plants.ssid"),
      label: getSettingValue(form, "plants.label"),
    },
    foscamCamera: {
      host: getSettingValue(form, "foscamCamera.host"),
      port: getSettingValue(form, "foscamCamera.port"),
    },
    cameras: collectSettingsRows(form, "cameras"),
    qnectSwitches: collectSettingsRows(form, "qnectSwitches"),
    heatingDevices: collectSettingsRows(form, "heatingDevices"),
    shutters: collectSettingsRows(form, "shutters"),
  };
}

function getSettingValue(form, setting) {
  return form.querySelector(`[data-setting='${setting}']`)?.value.trim() || "";
}

function collectSettingsRows(form, collection) {
  return [...form.querySelectorAll(`[data-collection='${collection}']`)]
    .map((row) => {
      const item = {};
      row.querySelectorAll("[data-field]").forEach((input) => {
        item[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value.trim();
      });
      return item;
    })
    .filter((item) => item.id || item.name);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (document.querySelector("#current-day")) {
  updateClock();
  setInterval(updateClock, 30_000);
}

renderSettingsAdmin();
renderSonoffSwitches();
renderCameras();
renderWebcamOverview();
renderCameraDetailPage();
renderHeatingOverview();
renderSwitchOverview();
renderShutterOverview();
renderPlantSystemPage();
renderNetworkPage();
bindClimateControls();
bindCameraLoginDialog();

if (document.querySelector("#current-temperature")) {
  updateWeather();
  setInterval(updateWeather, 10 * 60 * 1_000);
}

if (document.querySelector("#energy-chart")) {
  updateEnergy();
  setInterval(updateEnergy, 30 * 60 * 1_000);
}
