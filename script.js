document.addEventListener("DOMContentLoaded", () => {
  const loginDialog = document.querySelector("#login-dialog");
  const loginForm = document.querySelector("#login-form");
  const tripDialog = document.querySelector("#trip-dialog");
  const tripForm = document.querySelector("#trip-form");
  const formMessage = document.querySelector("#form-message");
  const routeEstimate = document.querySelector("#route-estimate");
  const submitButton = document.querySelector("#submit-trip");
  const tripList = document.querySelector("#trip-list");
  const tripCount = document.querySelector("#trip-count");
  const historyHeading = document.querySelector("#history-heading");
  const historyEmpty = document.querySelector("#history-empty");
  const mapStatus = document.querySelector("#map-status");
  const loginButton = document.querySelector("#login-button");
  const logoutButton = document.querySelector("#logout-button");
  const newTripButtons = [
    document.querySelector("#new-trip-button"),
    document.querySelector("#new-trip-panel-button"),
  ];
  let session = loadSession();
  let trips = [];
  let visibleTrips = [];
  let selectedTrip = null;
  let tripMap = null;
  let mapMarkers = [];
  let routeLine = null;
  let driverMarker = null;
  let locationWatchId = null;
  let locationPollId = null;
  let selectedTripLoadId = 0;
  let routePreviewTimer = null;
  let routePreviewRequestId = 0;
  let routePreview = null;
  const geocodeCache = new Map();

  function loadSession() {
    try {
      const stored = JSON.parse(localStorage.getItem("uniride-demo-session"));
      if (
        stored &&
        (stored.role === "user" || stored.role === "driver") &&
        typeof stored.name === "string"
      ) {
        return stored;
      }
    } catch {
      localStorage.removeItem("uniride-demo-session");
    }
    return null;
  }

  function persistSession() {
    if (session) {
      localStorage.setItem("uniride-demo-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("uniride-demo-session");
    }
    updateSessionUI();
  }

  function updateSessionUI() {
    const loggedIn = Boolean(session);
    const roleName = session?.role === "driver" ? "Conductor" : "Usuario";
    document.querySelector("#session-label").textContent = loggedIn
      ? `${session.name} · ${roleName}`
      : "Sin iniciar sesión";
    loginButton.hidden = loggedIn;
    logoutButton.hidden = !loggedIn;
    document.querySelector("#new-trip-button").hidden = session?.role !== "user";
    document.querySelector("#new-trip-panel-button").hidden = session?.role !== "user";
    historyHeading.textContent = !session
      ? "Solicitudes de viaje"
      : session.role === "driver"
        ? "Viajes disponibles"
        : "Mis viajes";
    historyEmpty.textContent = !session
      ? "Inicia sesión para ver los viajes."
      : session.role === "driver"
        ? "No hay solicitudes pendientes."
        : "Todavía no has solicitado viajes.";
    if (selectedTrip) {
      updateTrackButton();
    }
  }

  function setFormMessage(text, isError = false) {
    formMessage.textContent = text;
    formMessage.classList.toggle("is-error", isError);
  }

  function openLogin() {
    loginForm.elements.name.value = session?.name || "";
    loginForm.elements.role.value = session?.role || "user";
    loginForm.elements.vehicle.value = session?.vehicle || "";
    loginForm.elements.plate.value = session?.plate || "";
    loginForm.elements.color.value = session?.color || "";
    toggleDriverFields();
    loginDialog.showModal();
  }

  function toggleDriverFields() {
    const isDriver = loginForm.elements.role.value === "driver";
    document.querySelectorAll(".driver-field").forEach((field) => {
      field.hidden = !isDriver;
      const input = field.querySelector("input");
      input.required = isDriver;
    });
  }

  loginButton.addEventListener("click", openLogin);
  document.querySelector("#close-login").addEventListener("click", () => loginDialog.close());
  document.querySelector("#cancel-login").addEventListener("click", () => loginDialog.close());
  loginForm.elements.role.addEventListener("change", toggleDriverFields);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(loginForm);
    const name = values.get("name").trim();
    session = {
      name,
      role: values.get("role"),
      vehicle: values.get("vehicle").trim(),
      plate: values.get("plate").trim(),
      color: values.get("color").trim(),
    };
    persistSession();
    loginDialog.close();
    await loadTrips();
    if (session.role === "user" && visibleTrips.length) {
      renderTrip(visibleTrips[0]);
    }
  });

  logoutButton.addEventListener("click", () => {
    stopTracking();
    stopLocationPolling();
    session = null;
    selectedTrip = null;
    persistSession();
    renderTripList();
    clearMapRoute();
    document.querySelector("#driver-header").textContent = "Inicia sesión para continuar";
    document.querySelector("#driver-name").textContent = "UniRide";
    document.querySelector("#driver-caption").textContent = "Viajes de tu comunidad";
    document.querySelector("#vehicle-name").textContent = "Mapa de ruta";
    document.querySelector("#vehicle-details").textContent = "La ruta vial se mostrará al seleccionar un viaje.";
    document.querySelector("#trip-status").textContent = "Sin viaje seleccionado";
    document.querySelector("#trip-route").textContent = "Origen → Destino";
    document.querySelector("#trip-distance").textContent = "-- km";
    document.querySelector("#trip-duration").textContent = "-- min";
    document.querySelector("#trip-price").textContent = "--";
  });

  function initializeMap() {
    if (!window.L) {
      mapStatus.textContent = "No se pudo cargar Leaflet. Revisa tu conexión e inténtalo de nuevo.";
      return;
    }

    tripMap = window.L.map("trip-map", {
      scrollWheelZoom: true,
      zoomControl: false,
    }).setView([4.6533, -74.0836], 12);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(tripMap);

    document.querySelector("#zoom-in").addEventListener("click", () => tripMap.zoomIn());
    document.querySelector("#zoom-out").addEventListener("click", () => tripMap.zoomOut());
    document.querySelector("#fit-trip-map").addEventListener("click", () => {
      if (selectedTrip) {
        void renderRouteOnMap(selectedTrip);
      }
    });
    document.querySelector("#locate-me").addEventListener("click", locateMe);
    document.querySelector("#track-trip-button").addEventListener("click", toggleTracking);
    window.setTimeout(() => tripMap.invalidateSize(), 100);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      mapStatus.textContent = "Este navegador no ofrece geolocalización.";
      return;
    }

    mapStatus.textContent = "Solicitando permiso para obtener tu ubicación…";
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        tripMap.setView([coords.latitude, coords.longitude], 16);
        mapStatus.textContent = "Mostrando tu ubicación actual.";
      },
      () => {
        mapStatus.textContent = "No se pudo obtener tu ubicación. Revisa los permisos del navegador.";
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Ocurrió un error al procesar la solicitud.");
    }

    return data;
  }

  async function geocode(query) {
    const cacheKey = query.trim().toLocaleLowerCase();
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey);
    }

    const params = new URLSearchParams({ query });
    const { location } = await requestJson(`/api/geocode?${params.toString()}`);
    geocodeCache.set(cacheKey, location);
    return location;
  }

  async function getRoadRoute(origin, destination) {
    const params = new URLSearchParams({
      originLat: String(origin.latitude),
      originLon: String(origin.longitude),
      destinationLat: String(destination.latitude),
      destinationLon: String(destination.longitude),
    });
    const { route } = await requestJson(`/api/route?${params.toString()}`);
    return route;
  }

  function currentFormLocations() {
    return {
      origin: tripForm.elements.origin.value.trim(),
      destination: tripForm.elements.destination.value.trim(),
    };
  }

  function showEstimateStatus(text, isError = false) {
    routeEstimate.textContent = text;
    routeEstimate.classList.toggle("is-error", isError);
  }

  function clearRouteEstimate(text) {
    routePreview = null;
    tripForm.elements.durationMinutes.value = "";
    tripForm.elements.distanceKm.value = "";
    showEstimateStatus(text);
  }

  async function calculateFormRoute(originText, destinationText, requestId) {
    showEstimateStatus("Buscando las ubicaciones y calculando la ruta…");
    const origin = await geocode(originText);
    if (requestId !== routePreviewRequestId) {
      return null;
    }
    const destination = await geocode(destinationText);
    if (requestId !== routePreviewRequestId) {
      return null;
    }
    const route = await getRoadRoute(origin, destination);
    if (requestId !== routePreviewRequestId) {
      return null;
    }
    routePreview = {
      originText,
      destinationText,
      origin,
      destination,
      route,
    };
    tripForm.elements.durationMinutes.value = String(route.durationMinutes);
    tripForm.elements.distanceKm.value = String(route.distanceKm);
    showEstimateStatus(
      `Distancia por carretera: ${route.distanceKm} km · Duración estimada: ${route.durationMinutes} min.`,
    );
    return routePreview;
  }

  function scheduleRoutePreview() {
    window.clearTimeout(routePreviewTimer);
    const { origin, destination } = currentFormLocations();
    routePreviewRequestId += 1;
    routePreview = null;
    tripForm.elements.durationMinutes.value = "";
    tripForm.elements.distanceKm.value = "";

    if (origin.length < 3 || destination.length < 3) {
      showEstimateStatus("La distancia y duración se calcularán al ingresar origen y destino.");
      return;
    }

    const requestId = routePreviewRequestId;
    showEstimateStatus("Actualizando distancia y duración estimada…");
    routePreviewTimer = window.setTimeout(() => {
      calculateFormRoute(origin, destination, requestId).catch((error) => {
        if (requestId === routePreviewRequestId) {
          showEstimateStatus(error.message, true);
        }
      });
    }, 700);
  }

  tripForm.elements.origin.addEventListener("input", scheduleRoutePreview);
  tripForm.elements.destination.addEventListener("input", scheduleRoutePreview);

  function coordinatesOf(trip, key) {
    const coordinates = trip[key];
    return coordinates ? [coordinates.latitude, coordinates.longitude] : null;
  }

  function clearMapRoute() {
    mapMarkers.forEach((marker) => marker.remove());
    mapMarkers = [];
    routeLine?.remove();
    routeLine = null;
    driverMarker?.remove();
    driverMarker = null;
  }

  async function resolveTripCoordinates(trip) {
    const origin = trip.originCoordinates || await geocode(trip.origin);
    const destination = trip.destinationCoordinates || await geocode(trip.destination);
    return {
      origin: trip.originCoordinates
        ? coordinatesOf(trip, "originCoordinates")
        : [origin.latitude, origin.longitude],
      destination: trip.destinationCoordinates
        ? coordinatesOf(trip, "destinationCoordinates")
        : [destination.latitude, destination.longitude],
    };
  }

  async function renderRouteOnMap(trip) {
    selectedTrip = trip;
    if (!tripMap) {
      mapStatus.textContent = "No se pudo cargar el mapa. Revisa tu conexión.";
      return;
    }

    const requestId = ++selectedTripLoadId;
    mapStatus.textContent = "Calculando ruta por las calles…";
    try {
      const points = await resolveTripCoordinates(trip);
      const route = await getRoadRoute(
        { latitude: points.origin[0], longitude: points.origin[1] },
        { latitude: points.destination[0], longitude: points.destination[1] },
      );
      if (requestId !== selectedTripLoadId) {
        return;
      }

      clearMapRoute();
      mapMarkers = [
        window.L.circleMarker(points.origin, {
          radius: 10,
          color: "#fff",
          weight: 3,
          fillColor: "#1769c2",
          fillOpacity: 1,
        }).bindPopup(`<strong>Origen:</strong> ${escapeHtml(trip.origin)}`).addTo(tripMap),
        window.L.circleMarker(points.destination, {
          radius: 10,
          color: "#fff",
          weight: 3,
          fillColor: "#55a7f2",
          fillOpacity: 1,
        }).bindPopup(`<strong>Destino:</strong> ${escapeHtml(trip.destination)}`).addTo(tripMap),
      ];
      routeLine = window.L.polyline(route.coordinates, {
        color: "#1769c2",
        weight: 5,
        opacity: 0.88,
      }).addTo(tripMap);
      tripMap.fitBounds(routeLine.getBounds(), { padding: [50, 50], maxZoom: 16 });
      document.querySelector("#trip-distance").textContent = `${route.distanceKm} km`;
      document.querySelector("#trip-duration").textContent = `${route.durationMinutes} min`;
      mapStatus.textContent = `Ruta por calles · ${route.distanceKm} km · ${route.durationMinutes} min estimados.`;

      if (trip.driverCoordinates) {
        updateDriverMarker(trip.driverCoordinates);
      }
    } catch (error) {
      if (requestId === selectedTripLoadId) {
        mapStatus.textContent = `${error.message} Comprueba los nombres de origen y destino.`;
      }
    }
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function updateDriverMarker(location) {
    if (!tripMap || !window.L) {
      return;
    }
    const point = [location.latitude, location.longitude];
    if (!driverMarker) {
      driverMarker = window.L.circleMarker(point, {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: "#eb8b31",
        fillOpacity: 1,
      }).bindPopup("Ubicación actual del conductor").addTo(tripMap);
    } else {
      driverMarker.setLatLng(point);
    }
  }

  function updateTrackButton() {
    const button = document.querySelector("#track-trip-button");
    const canTrack = session?.role === "driver" && selectedTrip?.status === "accepted";
    button.hidden = !canTrack;
    button.textContent = locationWatchId === null
      ? "Iniciar seguimiento de ubicación"
      : "Detener seguimiento";
  }

  function stopTracking() {
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      locationWatchId = null;
    }
    updateTrackButton();
  }

  function stopLocationPolling() {
    if (locationPollId !== null) {
      window.clearInterval(locationPollId);
      locationPollId = null;
    }
  }

  function startLocationPolling() {
    stopLocationPolling();
    if (session?.role !== "user" || selectedTrip?.status !== "accepted") {
      return;
    }

    const tripId = selectedTrip.id;
    locationPollId = window.setInterval(async () => {
      try {
        const { trip } = await requestJson(`/api/trips/${encodeURIComponent(tripId)}`);
        trips = trips.map((savedTrip) => savedTrip.id === trip.id ? trip : savedTrip);
        visibleTrips = visibleTrips.map((savedTrip) => savedTrip.id === trip.id ? trip : savedTrip);
        selectedTrip = trip;
        if (trip.driverCoordinates) {
          updateDriverMarker(trip.driverCoordinates);
          mapStatus.textContent = `Seguimiento activo · última ubicación ${new Date(trip.lastLocationAt).toLocaleTimeString("es-CO")}.`;
        }
      } catch (error) {
        mapStatus.textContent = `Se perdió la conexión del seguimiento: ${error.message}`;
      }
    }, 5000);
  }

  function toggleTracking() {
    if (locationWatchId !== null) {
      stopTracking();
      mapStatus.textContent = "Seguimiento de ubicación detenido.";
      return;
    }
    if (!navigator.geolocation) {
      mapStatus.textContent = "Este navegador no ofrece geolocalización.";
      return;
    }

    mapStatus.textContent = "Solicitando permiso para compartir ubicación…";
    locationWatchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        if (!selectedTrip) {
          return;
        }
        const location = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        updateDriverMarker(location);
        tripMap.setView([location.latitude, location.longitude], Math.max(tripMap.getZoom(), 15));
        try {
          const { trip } = await requestJson(
            `/api/trips/${encodeURIComponent(selectedTrip.id)}/location`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ location }),
            },
          );
          trips = trips.map((savedTrip) => savedTrip.id === trip.id ? trip : savedTrip);
          selectedTrip = trip;
          mapStatus.textContent = "Compartiendo ubicación del conductor para el seguimiento.";
        } catch (error) {
          mapStatus.textContent = error.message;
        }
      },
      (error) => {
        stopTracking();
        mapStatus.textContent = error.code === error.PERMISSION_DENIED
          ? "Permite el acceso a la ubicación para iniciar el seguimiento."
          : "No se pudo obtener la ubicación. Comprueba el GPS y vuelve a intentarlo.";
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    updateTrackButton();
  }

  function renderTrip(trip) {
    stopLocationPolling();
    selectedTrip = trip;
    document.querySelector("#driver-header").textContent =
      trip.status === "accepted" ? "Viaje aceptado" : "Solicitud de viaje";
    document.querySelector("#driver-name").textContent =
      trip.status === "accepted" ? trip.acceptedBy : trip.requesterName || "Por asignar";
    document.querySelector("#driver-avatar").textContent =
      (trip.status === "accepted" ? trip.acceptedBy : trip.requesterName || "U")
        .slice(0, 2)
        .toLocaleUpperCase();
    document.querySelector("#driver-caption").textContent =
      trip.status === "accepted" ? "Conductor asignado" : `Solicitado por ${trip.requesterName || "usuario"}`;
    document.querySelector("#vehicle-name").textContent = trip.vehicle;
    document.querySelector("#vehicle-details").textContent =
      trip.status === "accepted"
        ? `Placa ${trip.plate} | Color: ${trip.color}`
        : "Esperando que un conductor acepte.";
    document.querySelector("#trip-status").textContent =
      trip.status === "accepted" ? `Conductor: ${trip.acceptedBy}` : "Esperando conductor";
    document.querySelector("#trip-route").textContent =
      `${trip.origin} → ${trip.destination}`;
    document.querySelector("#trip-price").textContent = formatMoney(trip.price);
    document.querySelector("#trip-distance").textContent = `${trip.distanceKm} km`;
    document.querySelector("#trip-duration").textContent = `${trip.durationMinutes} min`;
    updateTrackButton();
    startLocationPolling();
    void renderRouteOnMap(trip);
  }

  function renderTripList() {
    tripList.replaceChildren();
    visibleTrips = !session
      ? []
      : session.role === "driver"
        ? trips.filter((trip) => trip.status === "pending" || trip.acceptedBy === session.name)
        : trips.filter((trip) => trip.requesterName === session.name);
    tripCount.textContent = String(visibleTrips.length);
    historyEmpty.hidden = visibleTrips.length > 0;

    visibleTrips.forEach((trip) => {
      const item = document.createElement("li");
      const selectButton = document.createElement("button");
      const route = document.createElement("strong");
      const details = document.createElement("span");
      const footer = document.createElement("div");
      const state = document.createElement("span");

      item.className = "trip-list-item";
      selectButton.type = "button";
      selectButton.className = "trip-list-button";
      route.textContent = `${trip.origin} → ${trip.destination}`;
      details.textContent = session.role === "driver"
        ? `${trip.requesterName || trip.driverName} · ${trip.durationMinutes} min · ${formatMoney(trip.price)}`
        : `${trip.durationMinutes} min · ${formatMoney(trip.price)}`;
      selectButton.append(route, details);
      selectButton.addEventListener("click", () => renderTrip(trip));
      footer.className = "trip-list-footer";
      state.className = trip.status === "accepted" ? "trip-state accepted" : "trip-state";
      state.textContent = trip.status === "accepted"
        ? `Aceptado · ${trip.acceptedBy}`
        : "Pendiente";
      footer.append(state);
      item.append(selectButton);

      if (session.role === "driver" && trip.status === "pending") {
        const acceptButton = document.createElement("button");
        acceptButton.type = "button";
        acceptButton.className = "accept-trip-button";
        acceptButton.textContent = "Aceptar viaje";
        acceptButton.addEventListener("click", () => acceptTrip(trip, acceptButton));
        footer.append(acceptButton);
      }

      if (trip.status === "accepted" && session.role === "user" && trip.driverCoordinates) {
        state.textContent = `En seguimiento · ${trip.acceptedBy}`;
      }

      item.append(footer);
      tripList.append(item);
    });
  }

  async function acceptTrip(trip, button) {
    if (session?.role !== "driver") {
      return;
    }
    button.disabled = true;
    button.textContent = "Aceptando…";

    try {
      const { trip: acceptedTrip } = await requestJson(
        `/api/trips/${encodeURIComponent(trip.id)}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acceptedBy: session.name,
            vehicle: session.vehicle,
            plate: session.plate,
            color: session.color,
          }),
        },
      );
      trips = trips.map((savedTrip) => savedTrip.id === acceptedTrip.id ? acceptedTrip : savedTrip);
      renderTripList();
      renderTrip(acceptedTrip);
      mapStatus.textContent = "Viaje aceptado. Inicia el seguimiento para compartir tu ubicación.";
    } catch (error) {
      mapStatus.textContent = error.message;
      await loadTrips();
    }
  }

  newTripButtons.forEach((button) => button.addEventListener("click", () => {
    if (session?.role !== "user") {
      openLogin();
      return;
    }
    setFormMessage("");
    tripForm.reset();
    clearRouteEstimate("La distancia y duración se calcularán al ingresar origen y destino.");
    tripDialog.showModal();
    tripForm.elements.origin.focus();
  }));
  document.querySelector("#close-dialog").addEventListener("click", () => tripDialog.close());
  document.querySelector("#cancel-dialog").addEventListener("click", () => tripDialog.close());

  tripForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (session?.role !== "user") {
      setFormMessage("Inicia sesión como usuario para solicitar un viaje.", true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Buscando lugares…";
    setFormMessage("Validando la ruta antes de crear la solicitud…");

    const values = new FormData(tripForm);
    const { origin, destination } = currentFormLocations();

    try {
      let calculatedRoute = routePreview;
      if (
        !calculatedRoute ||
        calculatedRoute.originText !== origin ||
        calculatedRoute.destinationText !== destination
      ) {
        window.clearTimeout(routePreviewTimer);
        routePreviewRequestId += 1;
        calculatedRoute = await calculateFormRoute(origin, destination, routePreviewRequestId);
      }
      if (!calculatedRoute) {
        throw new Error("No se pudo calcular una ruta. Revisa el origen y el destino.");
      }
      const { origin: originCoordinates, destination: destinationCoordinates, route: roadRoute } =
        calculatedRoute;
      const payload = {
        requesterName: session.name,
        origin,
        destination,
        durationMinutes: roadRoute.durationMinutes,
        distanceKm: roadRoute.distanceKm,
        price: Number(values.get("price")),
        originCoordinates: {
          latitude: originCoordinates.latitude,
          longitude: originCoordinates.longitude,
        },
        destinationCoordinates: {
          latitude: destinationCoordinates.latitude,
          longitude: destinationCoordinates.longitude,
        },
      };
      const { trip } = await requestJson("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      trips.unshift(trip);
      renderTripList();
      renderTrip(trip);
      setFormMessage("Solicitud creada. Un conductor ya puede aceptarla.");
      routePreviewRequestId += 1;
      routePreview = null;
      tripForm.reset();
      clearRouteEstimate("La distancia y duración se calcularán al ingresar origen y destino.");
      window.setTimeout(() => tripDialog.close(), 1200);
    } catch (error) {
      setFormMessage(error.message, true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Guardar viaje";
    }
  });

  async function loadTrips() {
    try {
      const { trips: savedTrips } = await requestJson("/api/trips");
      trips = savedTrips;
      updateSessionUI();
      renderTripList();
    } catch (error) {
      historyEmpty.textContent = `${error.message} Inicia el servidor con npm start.`;
      historyEmpty.hidden = false;
    }
  }

  updateSessionUI();
  initializeMap();
  loadTrips();
});
