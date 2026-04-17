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
      status: "Tik voor login",
    },
    { id: "qnect-frontdoor", name: "Voordeur Qnect", url: "", status: "Niet ingesteld" },
    { id: "cam-2", name: "Camera 2", url: "" },
    { id: "cam-3", name: "Camera 3", url: "" },
    { id: "cam-4", name: "Camera 4", url: "" },
  ],
};

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

function formatEnergyTooltip(item) {
  return `<strong>${formatKwh(item.kwh)}</strong>`;
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
    title.textContent = `${item.date} ${item.time}: ${formatKwh(item.kwh)}/kWh`;
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
    `;

    if (!camera.url && camera.source) {
      tile.addEventListener("click", () => openCameraLoginDialog(camera.source));
    }

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
    `;

    if (!camera.url && camera.source) {
      tile.addEventListener("click", () => openCameraLoginDialog(camera.source));
    }

    container.appendChild(tile);
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
  });
}

if (document.querySelector("#current-day")) {
  updateClock();
  setInterval(updateClock, 30_000);
}

renderSonoffSwitches();
renderCameras();
renderWebcamOverview();
renderHeatingOverview();
renderSwitchOverview();
renderShutterOverview();
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
