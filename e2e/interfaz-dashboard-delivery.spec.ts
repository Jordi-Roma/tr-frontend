import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';

// Ensayo optativo, solo contra localhost y cuentas locales ya autorizadas.
const habilitado = process.env['STYLEAR_ANALITICA_E2E_LOCAL'] === '1';
const credenciales = '../tr-backend/.private/cuentas_prueba_roles_20261101.json';
test.skip(
  !habilitado || !existsSync(credenciales),
  'Requiere API local y cuentas privadas de ensayo.',
);
const api = 'http://127.0.0.1:8000/api/v1';
test.use({ actionTimeout: 15000 });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (r) => {
    const u = new URL(r.request().url());
    return ['127.0.0.1', 'localhost'].includes(u.hostname) ? r.continue() : r.abort();
  });
});

async function entrar(page: Page, rol: string): Promise<string> {
  const cuentas = JSON.parse(readFileSync(credenciales, 'utf8')) as {
    rol: string;
    usuario: string;
    password: string;
  }[];
  const cuenta = cuentas.find((c) => c.rol === rol)!;
  await page.goto('/e/stylear');
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(cuenta.usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill(cuenta.password);
  const respuesta = page.waitForResponse(
    (r) => r.url().endsWith('/autenticacion/login') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const r = await respuesta;
  expect(r.ok()).toBeTruthy();
  const token = ((await r.json()) as { access_token: string }).access_token;
  await expect(page).not.toHaveURL(/\/login$/);
  return token;
}

test('dashboard presenta gráficos antes de filtros y tablas', async ({ page }) => {
  await entrar(page, 'ADMINISTRADOR');
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Ventas completadas por fecha', exact: true }),
  ).toBeVisible();
  const graficos = page.locator('.graficos-principales');
  await expect(graficos.locator('app-barras-dashboard')).toHaveCount(4);
  expect(await graficos.evaluate((e) => e.getBoundingClientRect().top)).toBeLessThan(
    await page.locator('.filtros-dashboard').evaluate((e) => e.getBoundingClientRect().top),
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: '../tr-backend/.private/dashboard_graficos_web.png',
    fullPage: true,
  });
});

test('delivery abre tarjeta independiente, conserva cotización y permite cerrar con teclado', async ({
  page,
}) => {
  const cuenta = JSON.parse(
    readFileSync('../tr-backend/.private/cliente_nuevo_20261108.json', 'utf8'),
  ) as { usuario: string; password: string };
  await page.goto('/e/stylear');
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(cuenta.usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill(cuenta.password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.route('**/api/v1/carrito', (r) =>
    r.fulfill({
      json: {
        id: 99,
        total: 100,
        items: [
          {
            id: 1,
            producto_variante_id: 1,
            producto_id: 1,
            producto: 'Prenda de ensayo',
            categoria: 'Prendas',
            talla: 'M',
            color: 'Azul',
            sucursal_id: 1,
            sucursal: 'Centro',
            ciudad: 'Santa Cruz',
            cantidad: 1,
            precio_unitario: 100,
            subtotal: 100,
            stock_disponible: 5,
          },
        ],
        sucursales_disponibles: [
          { id: 1, nombre: 'Centro', ciudad: 'Santa Cruz', latitud: -17.78, longitud: -63.18 },
        ],
      },
    }),
  );
  await page.route('**/api/v1/pagos-empresa/pendiente', (r) => r.fulfill({ json: null }));
  await page.route('**/api/v1/delivery/cotizar', (r) =>
    r.fulfill({
      json: {
        disponible: true,
        cotizacion_id: 'ensayo-ui',
        vence_en: '2026-12-31T23:59:59Z',
        distancia_km: 2,
        tiempo_estimado_min: 12,
        costo_delivery: 15,
        ruta: [],
      },
    }),
  );
  await page.goto('/carrito');
  await page.getByRole('button', { name: 'Delivery', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Configurar delivery', exact: true });
  await expect(modal).toBeVisible();
  await page.getByLabel('Dirección de entrega', { exact: true }).fill('Avenida de ensayo 123');
  await page.getByRole('button', { name: 'Cotizar delivery', exact: true }).click();
  await page.getByLabel('Acepto la cotización del envío mostrada').check();
  expect((await new AxeBuilder({ page }).include('app-modal').analyze()).violations).toEqual([]);
  await page.screenshot({ path: '../tr-backend/.private/delivery_modal_web.png' });
  await page.getByRole('button', { name: 'Volver al resumen de compra' }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByText('Cotización aceptada', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Configurar y cotizar delivery' }).click();
  await expect(page.getByLabel('Dirección de entrega', { exact: true })).toHaveValue(
    'Avenida de ensayo 123',
  );
  await expect(page.getByLabel('Acepto la cotización del envío mostrada')).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).include('app-modal').analyze()).violations).toEqual([]);
  await page.screenshot({ path: '../tr-backend/.private/delivery_modal_web_mobile.png' });
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Configurar y cotizar delivery' })).toBeFocused();
});
