# Calendario Mundial 2026

Generador automático de un calendario [iCalendar](https://icalendar.org/) (`.ics`) con todos los partidos del Mundial 2026, obtenidos desde la API de MARCA. El archivo resultante se publica como recurso estático para que cualquier persona pueda suscribirse desde Google Calendar, Apple Calendar, Outlook u otra app compatible.

## ¿Qué hace?

El script `cron-update.js`: 

1. Consulta la API de partidos de MARCA.
2. Normaliza cada evento (equipos, banderas, fechas, sede y enlace al directo).
3. Genera un archivo `public/calendar.ics` en formato iCalendar.
4. *(Próximamente)* Hará commit y push automático a GitHub para desplegar la actualización en Vercel.

Cada evento incluye:

- Título con banderas y nombres de los equipos.
- Fecha y hora de inicio (UTC).
- Duración estimada de 2 horas.
- Enlace al minuto a minuto en MARCA.
- Sede del partido.
- Alarma 15 minutos antes del inicio.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (usa `fetch` nativo).

## Instalación

```bash
git clone https://github.com/xerty26/calendar-mundial-ue.git
cd calendar-mundial-ue
npm install
```

## Uso

Ejecutar una actualización manual del calendario:

```bash
npm start
```

Equivale a `node cron-update.js`. El archivo generado queda en `public/calendar.ics`.

## Suscripción al calendario

Una vez desplegado en Vercel, añade esta URL en tu aplicación de calendario:

```
https://<tu-dominio-vercel>/calendar.ics
```

El calendario se llama **Mundial 2026 - MARCA Live** y se refresca cada hora (`REFRESH-INTERVAL: PT1H`).

## Despliegue en Vercel

El proyecto se despliega como sitio estático. El archivo `vercel.json` configura las cabeceras HTTP de `/calendar.ics`:

- `Content-Type: text/calendar; charset=UTF-8`
- `Cache-Control: no-cache` (para que los clientes reciban siempre la versión más reciente)
- `Access-Control-Allow-Origin: *`

Conecta el repositorio de GitHub a Vercel; cada push a `main` redeployará el calendario actualizado.

## Cron (planificado)

Hoy el script se ejecuta a mano con `npm start`. La idea es programarlo como tarea periódica en un servidor:

```bash
# Ejemplo: cada hora
0 * * * * cd /ruta/a/calendar-mundial-ue && /usr/bin/node cron-update.js >> /var/log/calendar-mundial.log 2>&1
```

Cuando el cron esté activo, se habilitará la sincronización con GitHub al final del script:

```js
await git.add(outputFile);
await git.commit(`Automated calendar update: ${new Date().toISOString()}`);
await git.push('origin', 'main');
```

Para que el push automático funcione sin intervención, el servidor necesita autenticación configurada (clave SSH o [Personal Access Token](https://github.com/settings/tokens) de GitHub).

## Estructura del proyecto

```
calendar-mundial-ue/
├── cron-update.js      # Script principal (futuro cron)
├── public/
│   └── calendar.ics    # Calendario generado
├── vercel.json         # Cabeceras HTTP para Vercel
├── package.json
└── README.md
```

## Fuente de datos

Los partidos se obtienen de:

```
https://www.marca.com/eventos/marcador/api/2025/0117/api-calendario-carga.json
```

Los códigos de selección FIFA se mapean a emojis de bandera mediante un diccionario interno en `cron-update.js`. Si un equipo no está en el diccionario, se usa `🔜` como marcador temporal.

## Licencia

ISC
