# UniRide

UniRide incluye dos implementaciones para compartir viajes universitarios: una
demostración local sencilla y una aplicación con frontend React y API FastAPI.

## Demostración local

Requiere Node.js 22.5 o superior. Desde la raíz del proyecto:

```bash
npm start
```

Abre http://localhost:3000. Los datos se guardan en `uniride.sqlite`, que no se
incluye en Git. Esta demostración permite iniciar sesión con perfiles de prueba,
crear solicitudes de viaje, aceptar viajes como conductor y ver ubicaciones en
el mapa. No valida identidades ni contraseñas reales.

## Aplicación React + FastAPI

Esta versión incluye registro e inicio de sesión, roles de pasajero, conductor y
administrador, paneles por rol, un mapa interactivo de Bogotá y gestión
administrativa. Requiere Node.js, Python 3.12 y PostgreSQL. Usa Python 3.12
para que `psycopg2-binary`, el adaptador de PostgreSQL fijado por el backend,
se instale desde un paquete precompilado en Windows.

### 1. Preparar PostgreSQL

Crea una base de datos llamada `uniride` y ejecuta el archivo
[`database/schema.sql`](database/schema.sql) sobre esa base.

### 2. Configurar e iniciar el backend

En una terminal, desde la raíz del proyecto:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Si ya creaste `.venv` con otra versión de Python, elimínala antes de recrearla
con el comando anterior.

Edita `backend/.env` y configura la URL de PostgreSQL, una clave secreta y el
código de registro de administrador. El formato de la URL está en
[`backend/.env.example`](backend/.env.example).

Con el entorno virtual activo y estando en la carpeta `backend`, inicia la API:

```powershell
uvicorn app.main:app --reload
```

La API queda disponible en http://localhost:8000 y su documentación interactiva
en http://localhost:8000/docs.

### 3. Iniciar el frontend

En otra terminal, desde la raíz del proyecto:

```powershell
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. El frontend se conecta a la API en
http://localhost:8000.

Abre **Mapa** desde la página de inicio o **Buscar rutas / Mis rutas** desde tu
panel para ver el mapa y los viajes publicados. El mapa consulta las rutas de
PostgreSQL; como el modelo actual solo guarda origen y destino como texto, aún
no dibuja el recorrido sobre el mapa.

Desde el panel de conductor, **Crear nueva ruta** publica el viaje en PostgreSQL.
La primera vez también solicita licencia, SOAT y los datos del vehículo; después
puedes escoger un vehículo ya registrado. Las rutas publicadas aparecen en el
panel del conductor y en el mapa.

Para generar la versión de producción del frontend, ejecuta `npm run build`
dentro de `frontend/`, o desde la raíz del proyecto después de instalar sus
dependencias.
