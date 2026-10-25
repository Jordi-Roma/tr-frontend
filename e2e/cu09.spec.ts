import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const datos = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as { a: { codigo: string } };
const sello = Date.now();

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':58127') });
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
  page.on('dialog', dialog => dialog.accept());
  await page.goto(`/e/${datos.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(datos.a.codigo);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
});

async function accesible(page: Page) {
  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations).toEqual([]);
}

for (const [ruta, nuevo] of [
  ['categorias','Nueva categoria'], ['tallas','Nueva talla'], ['colores','Nuevo color'],
  ['marcas','Nueva marca'], ['temporadas','Nueva temporada'], ['colecciones','Nueva coleccion'],
]) {
  test(`CU09: ${ruta}, crear, editar, desactivar y reactivar con AXE`, async ({ page }) => {
    await page.goto('/'+ruta);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (ruta === 'colecciones') {
      // Temporada propia creada desde su pantalla, sin depender del orden de otros tests.
      await page.goto('/temporadas');
      await page.getByRole('button', { name: 'Nueva temporada', exact: true }).click();
      const modal = page.getByRole('dialog');
      await modal.locator('#nombre').fill('Base colección '+sello);
      await modal.getByRole('button', { name: 'Crear temporada', exact: true }).click();
      await expect(modal).not.toBeVisible();
      await page.goto('/colecciones');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    await accesible(page);
    await page.getByRole('button', { name: nuevo, exact: true }).click();
    const modal = page.getByRole('dialog');
    const nombre = `09${ruta}${String(sello).slice(-6)}`;
    await modal.locator('#nombre').fill(nombre);
    if (ruta === 'colecciones') await modal.locator('#temporada_id').selectOption({ label: `Base colección ${sello} (2026)` });
    await accesible(page);
    await modal.locator('button[type=submit]').click();
    await expect(modal).not.toBeVisible();
    await page.locator('#busqueda').fill(nombre);
    let fila = page.getByRole('row').filter({ hasText: nombre });
    await expect(fila).toBeVisible();
    await fila.getByRole('button', { name: 'Editar', exact: true }).click();
    await modal.locator('#nombre').fill(nombre+' editada');
    await modal.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(modal).not.toBeVisible();
    fila = page.getByRole('row').filter({ hasText: nombre+' editada' });
    await expect(fila).toBeVisible();
    await page.locator('#filtroEstado').selectOption('todos');
    await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
    await expect(fila.getByText('Inactivo', { exact: true })).toBeVisible();
    await fila.getByRole('button', { name: 'Activar', exact: true }).click();
    await expect(fila.getByText('Activo', { exact: true })).toBeVisible();
  });
}

test('CU09: duplicado conserva el formulario y muestra el error dentro del diálogo', async ({ page }) => {
  await page.goto('/marcas');
  const nombre = 'Duplicada '+sello;
  await page.getByRole('button', { name: 'Nueva marca', exact: true }).click();
  const modal=page.getByRole('dialog');
  await modal.locator('#nombre').fill(nombre);
  await modal.locator('button[type=submit]').click();
  await expect(modal).not.toBeVisible();
  await page.getByRole('button', { name: 'Nueva marca', exact: true }).click();
  await modal.locator('#nombre').fill(nombre.toLowerCase());
  await modal.locator('button[type=submit]').click();
  await expect(modal.getByRole('alert')).toContainText('Ya existe');
  await expect(modal.locator('#nombre')).toHaveValue(nombre.toLowerCase());
  await accesible(page);
});


test('CU09: fallo de consulta permite reintentar sin perder la sesión', async ({ page }) => {
  let fallo = true;
  await page.route('**/api/v1/marcas', async route => {
    if (fallo && route.request().method() === 'GET') return route.abort();
    return route.fallback();
  });
  await page.goto('/marcas');
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar');
  fallo = false;
  await page.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('marcas');
  await accesible(page);
});
