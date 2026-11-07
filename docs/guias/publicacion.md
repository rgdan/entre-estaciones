# Publicación en GitHub Pages

El [workflow de publicación](../../.github/workflows/pages.yml) instala con pnpm, ejecuta las pruebas, compila y publica `dist/` con cada push a `main`. También admite ejecución manual.

## Habilitar Pages

1. Abra **Settings → Pages** en el repositorio.
2. En **Build and deployment → Source**, seleccione **GitHub Actions**.
3. Envíe los commits a `main`, o abra **Actions → Publish to GitHub Pages → Run workflow**.

El repositorio es [rgdan/entre-estaciones](https://github.com/rgdan/entre-estaciones). La dirección prevista es [rgdan.github.io/entre-estaciones](https://rgdan.github.io/entre-estaciones/). La ejecución del workflow mostrará la URL publicada.

El workflow obtiene de Pages la ruta base. Los recursos, la portada y los enlaces de la página 404 funcionan bajo `/entre-estaciones/` o en la raíz de un dominio propio. GitHub Pages utiliza `404.html` para las rutas inexistentes.

## Comprobar antes de publicar

```bash
pnpm build --base /entre-estaciones/
pnpm preview --base /entre-estaciones/
```

Abra [localhost:4173/entre-estaciones/](http://localhost:4173/entre-estaciones/). Para ejecutar la suite de navegador contra esa ruta:

```bash
TEST_URL=http://127.0.0.1:4173/entre-estaciones pnpm test:browser
```

Para otro alojamiento estático, ejecute `pnpm build` y publique el contenido de `dist/`. Si utiliza un dominio propio, configure la URL canónica, la URL absoluta de la imagen social y el sitemap con ese dominio.

El workflow sigue las guías oficiales de [Vite](https://vite.dev/guide/static-deploy.html#github-pages) y [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

[Volver al README](../../README.md)
