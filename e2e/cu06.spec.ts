import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const sello = Date.now();
const nombreCiudad = `Ciudad CU06 navegador ${sello}`;
const nombreEditada = `Ciudad CU06 editada ${sello}`;
const nombreSucursal = `Sucursal CU06 navegador ${sello}`;
const datos = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { codigo: string };
  b: { codigo: string };
};

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':58127') });
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
  page.on('dialog', (dialog) => dialog.accept());
});

async function entrar(page: Page, codigo: string) {
  await page.goto(`/e/${codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(codigo);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function accesible(page: Page) {
  const resultado = await new AxeBuilder({ page }).analyze();
  expect(resultado.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
}

test('CU06: ciudad propia, edición y ciclo de desactivación con interfaz accesible', async ({ page }) => {
  await entrar(page, datos.a.codigo);
  await page.goto('/ciudades');
  await expect(page.getByRole('heading', { name: 'Gestión de ciudades' })).toBeVisible();
  await accesible(page);
  await page.getByRole('button', { name: 'Nueva ciudad', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Nueva ciudad', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Nueva ciudad', exact: true }).click();
  await dialog.getByLabel('Nombre', { exact: true }).fill(nombreCiudad);
  await dialog.getByLabel('Departamento').fill('Prueba');
  await dialog.getByRole('button', { name: 'Crear ciudad', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await accesible(page);
  await dialog.getByRole('button', { name: 'Crear ciudad', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: nombreCiudad });
  await expect(fila).toBeVisible();
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await dialog.getByLabel('Nombre', { exact: true }).fill(nombreEditada);
  await dialog.getByRole('button', { name: 'Guardar ciudad', exact: true }).click();
  const editada = page.getByRole('row').filter({ hasText: nombreEditada });
  await expect(editada).toBeVisible();
  await editada.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(editada.getByText('Inactivo', { exact: true })).toBeVisible();
  await expect(editada.getByRole('button', { name: 'Editar', exact: true })).toBeDisabled();
  await editada.getByRole('button', { name: 'Activar', exact: true }).click();
  await expect(editada.getByText('Activo', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await accesible(page);
});

test('CU06: sucursal conserva estado y puede reactivarse desde el listado', async ({ page }) => {
  await entrar(page, datos.b.codigo);
  await page.goto('/ciudades');
  await expect(page.getByText(nombreEditada, { exact: true })).toHaveCount(0);
  await page.goto('/sucursales');
  await expect(page.getByRole('heading', { name: 'Gestión de sucursales' })).toBeVisible();
  await accesible(page);
  await page.getByRole('button', { name: 'Nueva sucursal', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ciudad', { exact: true }).selectOption({ label: 'Ciudad de prueba - Prueba' });
  await dialog.getByLabel('Nombre', { exact: true }).fill(nombreSucursal);
  await dialog.getByLabel('Dirección', { exact: true }).fill('Calle de prueba 123');
  await accesible(page);
  await dialog.getByRole('button', { name: 'Crear sucursal', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: nombreSucursal });
  await expect(fila).toBeVisible();
  await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(fila.getByText('Inactivo', { exact: true })).toBeVisible();
  await fila.getByRole('button', { name: 'Activar', exact: true }).click();
  await expect(fila.getByText('Activo', { exact: true })).toBeVisible();
});
