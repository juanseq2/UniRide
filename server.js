const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const database = new DatabaseSync(path.join(root, "uniride.sqlite"));
const maxBodyBytes = 16 * 1024;
const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();
let nextGeocodeAt = 0;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

database.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    driver_name TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    plate TEXT NOT NULL,
    color TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    price REAL NOT NULL,
    created_at TEXT NOT NULL,
    origin_lat REAL,
    origin_lon REAL,
    destination_lat REAL,
    destination_lon REAL,
    status TEXT NOT NULL DEFAULT 'pending',
    accepted_by TEXT,
    accepted_at TEXT,
    requester_name TEXT,
    driver_lat REAL,
    driver_lon REAL,
    last_location_at TEXT
  )
`);

const existingColumns = new Set(
  database.prepare("PRAGMA table_info(trips)").all().map((column) => column.name),
);
const migrations = [
  ["origin_lat", "REAL"],
  ["origin_lon", "REAL"],
  ["destination_lat", "REAL"],
  ["destination_lon", "REAL"],
  ["status", "TEXT NOT NULL DEFAULT 'pending'"],
  ["accepted_by", "TEXT"],
  ["accepted_at", "TEXT"],
  ["requester_name", "TEXT"],
  ["driver_lat", "REAL"],
  ["driver_lon", "REAL"],
  ["last_location_at", "TEXT"],
];

for (const [column, definition] of migrations) {
  if (!existingColumns.has(column)) {
    database.exec(`ALTER TABLE trips ADD COLUMN ${column} ${definition}`);
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bodyTooLarge = false;

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      if (bodyTooLarge) {
        return;
      }
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maxBodyBytes) {
        bodyTooLarge = true;
      }
    });
    request.on("end", () => {
      if (bodyTooLarge) {
        reject(new HttpError(413, "La solicitud es demasiado grande."));
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpError(400, "El cuerpo de la solicitud debe ser JSON válido."));
      }
    });
    request.on("error", reject);
  });
}

function cleanText(value, label, maxLength) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} es obligatorio.`);
  }

  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) {
    throw new HttpError(400, `${label} debe tener entre 1 y ${maxLength} caracteres.`);
  }
  return cleaned;
}

function validNumber(value, label, min, max, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new HttpError(400, `${label} debe ser un número entre ${min} y ${max}${integer ? " entero" : ""}.`);
  }
  return value;
}

function toTrip(row) {
  return {
    id: row.id,
    driverName: row.driver_name,
    vehicle: row.vehicle,
    origin: row.origin,
    destination: row.destination,
    plate: row.plate,
    color: row.color,
    durationMinutes: row.duration_minutes,
    distanceKm: row.distance_km,
    price: row.price,
    createdAt: row.created_at,
    originCoordinates: row.origin_lat === null ? null : { latitude: row.origin_lat, longitude: row.origin_lon },
    destinationCoordinates: row.destination_lat === null ? null : { latitude: row.destination_lat, longitude: row.destination_lon },
    status: row.status,
    acceptedBy: row.accepted_by,
    acceptedAt: row.accepted_at,
    requesterName: row.requester_name,
    driverCoordinates: row.driver_lat === null ? null : { latitude: row.driver_lat, longitude: row.driver_lon },
    lastLocationAt: row.last_location_at,
  };
}

function coordinates(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `No se encontró la ubicación de ${label}. Busca el lugar de nuevo.`);
  }
  return {
    latitude: validNumber(value.latitude, `La latitud de ${label}`, -90, 90),
    longitude: validNumber(value.longitude, `La longitud de ${label}`, -180, 180),
  };
}

function createTrip(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpError(400, "Envía los datos del viaje como un objeto JSON.");
  }

  const trip = {
    id: randomUUID(),
    requesterName: cleanText(input.requesterName, "El nombre del usuario", 80),
    driverName: "Por asignar",
    vehicle: "Por asignar",
    origin: cleanText(input.origin, "El origen", 120),
    destination: cleanText(input.destination, "El destino", 120),
    plate: "Por asignar",
    color: "Por asignar",
    durationMinutes: validNumber(input.durationMinutes, "La duración", 1, 1440, true),
    distanceKm: validNumber(input.distanceKm, "La distancia", 0.1, 10000),
    price: validNumber(input.price, "El precio", 0, 1000000),
    originCoordinates: coordinates(input.originCoordinates, "origen"),
    destinationCoordinates: coordinates(input.destinationCoordinates, "destino"),
    createdAt: new Date().toISOString(),
  };

  database.prepare(`
    INSERT INTO trips (
      id, driver_name, vehicle, origin, destination, plate, color,
      duration_minutes, distance_km, price, created_at,
      origin_lat, origin_lon, destination_lat, destination_lon, status, requester_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    trip.id,
    trip.driverName,
    trip.vehicle,
    trip.origin,
    trip.destination,
    trip.plate,
    trip.color,
    trip.durationMinutes,
    trip.distanceKm,
    trip.price,
    trip.createdAt,
    trip.originCoordinates.latitude,
    trip.originCoordinates.longitude,
    trip.destinationCoordinates.latitude,
    trip.destinationCoordinates.longitude,
    trip.requesterName,
  );

  return {
    ...trip,
    status: "pending",
    acceptedBy: null,
    acceptedAt: null,
    driverCoordinates: null,
    lastLocationAt: null,
  };
}

async function getRoadRoute(origin, destination) {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "UniRideLocalDemo/1.0" },
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("No se pudo contactar al servicio de rutas:", error);
    throw new HttpError(503, "No se pudo obtener la ruta vial. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (!response.ok) {
    console.error("El servicio de rutas respondió con HTTP", response.status);
    throw new HttpError(502, "El servicio de rutas no está disponible por el momento.");
  }

  const result = await response.json();
  const route = result.routes?.[0];
  if (result.code !== "Ok" || !route || !Array.isArray(route.geometry?.coordinates)) {
    throw new HttpError(404, "No encontramos una ruta vial entre esas ubicaciones.");
  }

  return {
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
  };
}

function geocodeLocation(query) {
  const normalizedQuery = query.trim();
  const cacheKey = normalizedQuery.toLocaleLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return Promise.resolve(geocodeCache.get(cacheKey));
  }

  const result = geocodeQueue.then(async () => {
    const waitMs = Math.max(0, nextGeocodeAt - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    nextGeocodeAt = Date.now() + 1100;

    let response;
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("q", normalizedQuery);
      response = await fetch(url, {
        headers: {
          "User-Agent": "UniRideLocalDemo/1.0 (local university transport prototype)",
          "Accept-Language": "es",
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      console.error("No se pudo contactar al servicio de mapas:", error);
      throw new HttpError(503, "No se pudo contactar al servicio del mapa. Revisa la conexión e inténtalo de nuevo.");
    }

    if (!response.ok) {
      console.error("El servicio de mapas respondió con HTTP", response.status);
      throw new HttpError(502, "El servicio del mapa no está disponible por el momento.");
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new HttpError(404, `No encontramos "${normalizedQuery}". Agrega ciudad y país a la búsqueda.`);
    }

    const location = {
      latitude: Number(results[0].lat),
      longitude: Number(results[0].lon),
      label: results[0].display_name,
    };
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      throw new HttpError(502, "El mapa devolvió coordenadas no válidas para ese lugar.");
    }
    geocodeCache.set(cacheKey, location);
    return location;
  });

  geocodeQueue = result.catch(() => {});
  return result;
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/geocode") {
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" });
      response.end();
      return;
    }

    const query = new URL(request.url, `http://${host}:${port}`).searchParams.get("query");
    if (!query || query.trim().length < 3 || query.length > 200) {
      sendJson(response, 400, { error: "Escribe una ubicación de entre 3 y 200 caracteres." });
      return;
    }

    try {
      sendJson(response, 200, { location: await geocodeLocation(query) });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { error: error.message });
      } else {
        console.error("Error al buscar ubicación:", error);
        sendJson(response, 502, { error: "No se pudo resolver esa ubicación en el mapa." });
      }
    }
    return;
  }

  if (pathname === "/api/route") {
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" });
      response.end();
      return;
    }

    const params = new URL(request.url, `http://${host}:${port}`).searchParams;
    try {
      const coordinateParams = [
        "originLat",
        "originLon",
        "destinationLat",
        "destinationLon",
      ];
      if (coordinateParams.some((parameter) => params.get(parameter) === null)) {
        throw new HttpError(400, "Faltan las coordenadas del origen o del destino.");
      }
      const origin = {
        latitude: validNumber(Number(params.get("originLat")), "La latitud del origen", -90, 90),
        longitude: validNumber(Number(params.get("originLon")), "La longitud del origen", -180, 180),
      };
      const destination = {
        latitude: validNumber(Number(params.get("destinationLat")), "La latitud del destino", -90, 90),
        longitude: validNumber(Number(params.get("destinationLon")), "La longitud del destino", -180, 180),
      };
      sendJson(response, 200, { route: await getRoadRoute(origin, destination) });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { error: error.message });
      } else {
        console.error("Error al calcular la ruta:", error);
        sendJson(response, 502, { error: "No se pudo calcular la ruta vial." });
      }
    }
    return;
  }

  const locationMatch = pathname.match(/^\/api\/trips\/([^/]+)\/location$/);
  if (locationMatch && request.method === "POST") {
    try {
      const id = decodeURIComponent(locationMatch[1]);
      const input = await readJson(request);
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new HttpError(400, "Envía las coordenadas como un objeto JSON.");
      }
      const location = coordinates(input.location, "del conductor");
      const updatedAt = new Date().toISOString();
      const result = database.prepare(`
        UPDATE trips
        SET driver_lat = ?, driver_lon = ?, last_location_at = ?
        WHERE id = ? AND status = 'accepted'
      `).run(location.latitude, location.longitude, updatedAt, id);

      if (result.changes === 0) {
        const existing = database.prepare("SELECT status FROM trips WHERE id = ?").get(id);
        if (!existing) {
          sendJson(response, 404, { error: "No encontramos ese viaje." });
        } else {
          sendJson(response, 409, { error: "El conductor solo puede compartir ubicación en un viaje aceptado." });
        }
        return;
      }

      const row = database.prepare("SELECT * FROM trips WHERE id = ?").get(id);
      sendJson(response, 200, { trip: toTrip(row) });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { error: error.message });
      } else {
        console.error("Error al actualizar ubicación del conductor:", error);
        sendJson(response, 500, { error: "No se pudo compartir la ubicación." });
      }
    }
    return;
  }

  const tripMatch = pathname.match(/^\/api\/trips\/([^/]+)$/);
  if (tripMatch && request.method === "GET") {
    const id = decodeURIComponent(tripMatch[1]);
    const row = database.prepare("SELECT * FROM trips WHERE id = ?").get(id);
    if (!row) {
      sendJson(response, 404, { error: "No encontramos ese viaje." });
      return;
    }
    sendJson(response, 200, { trip: toTrip(row) });
    return;
  }

  const acceptMatch = pathname.match(/^\/api\/trips\/([^/]+)\/accept$/);
  if (acceptMatch && request.method === "POST") {
    try {
      const id = decodeURIComponent(acceptMatch[1]);
      const input = await readJson(request);
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new HttpError(400, "Envía los datos del conductor como un objeto JSON.");
      }
      const acceptedBy = cleanText(input.acceptedBy, "El conductor", 80);
      const vehicle = cleanText(input.vehicle, "El vehículo", 80);
      const plate = cleanText(input.plate, "La placa", 12);
      const color = cleanText(input.color, "El color", 40);
      const acceptedAt = new Date().toISOString();
      const result = database.prepare(`
        UPDATE trips
        SET status = 'accepted', accepted_by = ?, accepted_at = ?,
            driver_name = ?, vehicle = ?, plate = ?, color = ?
        WHERE id = ? AND status = 'pending'
      `).run(acceptedBy, acceptedAt, acceptedBy, vehicle, plate, color, id);

      if (result.changes === 0) {
        const existing = database.prepare("SELECT status FROM trips WHERE id = ?").get(id);
        if (!existing) {
          sendJson(response, 404, { error: "No encontramos esa solicitud de viaje." });
        } else {
          sendJson(response, 409, { error: "Este viaje ya fue aceptado por otro conductor." });
        }
        return;
      }

      const row = database.prepare("SELECT * FROM trips WHERE id = ?").get(id);
      sendJson(response, 200, { trip: toTrip(row) });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { error: error.message });
      } else {
        console.error("Error al aceptar el viaje:", error);
        sendJson(response, 500, { error: "No se pudo aceptar el viaje." });
      }
    }
    return;
  }

  if (pathname !== "/api/trips") {
    sendJson(response, 404, { error: "No se encontró este recurso." });
    return;
  }

  if (request.method === "GET") {
    const rows = database.prepare("SELECT * FROM trips ORDER BY created_at DESC").all();
    sendJson(response, 200, { trips: rows.map(toTrip) });
    return;
  }

  if (request.method === "POST") {
    try {
      const input = await readJson(request);
      const trip = createTrip(input);
      sendJson(response, 201, { trip });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { error: error.message });
      } else {
        console.error("Error al guardar el viaje:", error);
        sendJson(response, 500, { error: "No se pudo guardar el viaje en la base de datos." });
      }
    }
    return;
  }

  response.writeHead(405, { Allow: "GET, POST" });
  response.end();
}

function serveStatic(request, response, pathname) {
  let requestedPath;
  try {
    requestedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400);
    response.end("Invalid URL");
    return;
  }

  const filePath = path.resolve(root, `.${requestedPath === "/" ? "/index.html" : requestedPath}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Unable to read file");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(contents);
  });
}

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, `http://${host}:${port}`).pathname;
  } catch {
    sendJson(response, 400, { error: "La URL no es válida." });
    return;
  }

  if (pathname.startsWith("/api/")) {
    void handleApi(request, response, pathname).catch((error) => {
      console.error("Error en la API:", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "Ocurrió un error interno." });
      }
    });
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  serveStatic(request, response, pathname);
});

server.listen(port, host, () => {
  console.log(`UniRide disponible en http://${host}:${port}`);
  console.log(`Base SQLite local: ${path.join(root, "uniride.sqlite")}`);
});

function closeServer() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
