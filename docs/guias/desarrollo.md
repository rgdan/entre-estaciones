# Desarrollo

La aplicación usa Vue 3, Vite y Leaflet. Requiere Node.js 22.18 o superior y pnpm 12.16.1, fijado en `package.json`.

## Ejecutar localmente

```bash
pnpm install --frozen-lockfile
pnpm start
```

Abra [localhost:4173](http://localhost:4173). Los cambios se actualizan durante el desarrollo.

## Comprobar cambios

```bash
pnpm test
pnpm build
pnpm preview
```

Las pruebas verifican los 94 servicios, las conexiones, las coordenadas y las traducciones. La vista previa sirve el contenido compilado de `dist/`.

Para probar la interfaz, mantenga la vista previa abierta y ejecute en otra terminal:

```bash
pnpm exec playwright install chromium
pnpm test:browser
```

La suite comprueba transbordos, selección y limpieza de estaciones, mapa, preferencias, fechas inválidas, teclado y WCAG AA con axe. Revisa ambos idiomas y temas entre 320 y 1920px. Las capturas se guardan en `.shots/`.

Para otro servidor, indique `TEST_URL=http://127.0.0.1:4400 pnpm test:browser`. Si ya tiene Chromium, puede indicar su ruta con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Archivos principales

| Ruta | Contenido |
| --- | --- |
| `src/App.vue` | Formulario, resultados, preferencias y detalle del viaje |
| `src/i18n.mjs` | Textos en español e inglés |
| `styles.css` | Temas y adaptación a pantallas |
| `lib/map.mjs` | Mapa Leaflet de carga diferida |
| `lib/transfers.mjs` | Búsqueda de conexiones entre líneas |
| `lib/journeys.mjs` | Horas y calendario de servicio |
| `data/` | Horarios y coordenadas |
| `tests/` | Pruebas de datos e interfaz |
| `.github/workflows/pages.yml` | Compilación y publicación en Pages |

Las tipografías se sirven desde `assets/fonts/`. Vue y Leaflet se incluyen en la compilación; el mapa base requiere conexión a OpenStreetMap.

[Volver al README](../../README.md)
