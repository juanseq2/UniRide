# UniRide — Guía de arranque (Fase 1)

## 1. Crear la base de datos

Abre pgAdmin (o la terminal `psql`) y ejecuta:

```sql
CREATE DATABASE uniride;
```

Luego, conectado a la base `uniride`, corre el archivo `database/schema.sql`
(en pgAdmin: clic derecho sobre la base → Query Tool → pega el contenido → Run).

## 2. Configurar el backend

```bash
cd backend
python -m venv venv

# Activar el entorno virtual:
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Copia `.env.example` como `.env` y reemplaza `TU_PASSWORD` por la contraseña
que pusiste al instalar PostgreSQL.

## 3. Levantar el backend

```bash
uvicorn app.main:app --reload
```

Abre en el navegador:
- http://localhost:8000 → debe responder `{"mensaje": "UniRide API funcionando"}`
- http://localhost:8000/health → debe responder `{"status": "ok", "database": "conectada"}`
- http://localhost:8000/docs → documentación interactiva de la API (Swagger), generada automáticamente por FastAPI

Si `/health` te da error, revisa que el password en `.env` sea correcto y que
el servicio de PostgreSQL esté corriendo.

## 4. Crear el frontend (React)

Esto todavía no está en esta carpeta — lo creamos con un solo comando.
Desde la raíz del proyecto (`uniride/`, no dentro de `backend/`):

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev
```

Esto te abre React en http://localhost:5173

## Estructura del proyecto

```
uniride/
├── backend/
│   ├── app/
│   │   ├── main.py          # arranca la API
│   │   ├── database.py      # conexión a PostgreSQL
│   │   ├── models/          # tablas como clases de Python
│   │   └── routers/         # (aquí irán los endpoints de cada módulo)
│   ├── requirements.txt
│   └── .env.example
├── database/
│   └── schema.sql           # todas las tablas del diagrama de clases
└── frontend/                # lo crea el comando de npm (paso 4)
```

## Siguiente paso

Una vez tengas `/health` respondiendo "conectada" y React corriendo en
localhost:5173, seguimos con el módulo de autenticación (RF-01): registro,
login con correo institucional y generación del token de sesión.
