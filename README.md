# UniRide

Aplicación de demostración para compartir viajes universitarios entre estudiantes.

## Requisitos

- Node.js 22.5 o superior (usa `node:sqlite` integrado).
- Conexión a internet para cargar mapas y buscar rutas con OpenStreetMap.

## Iniciar localmente

```bash
npm start
```

Abre http://localhost:3000. Los datos se guardan localmente en `uniride.sqlite`, que está excluido de Git.

## Funciones

- Iniciar sesión en modo demostración como usuario o conductor.
- Crear solicitudes de viaje y calcular automáticamente distancia y duración por carretera.
- Aceptar viajes como conductor y compartir ubicación con geolocalización del navegador.
- Ver ubicaciones y seguimiento sobre Leaflet/OpenStreetMap.

El inicio de sesión es solo para pruebas locales y no valida contraseñas ni identidades reales.
