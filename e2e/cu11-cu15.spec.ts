import { test, expect, Page, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const d = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { codigo: string };
  clienteA: string;
  cajero: string;
  encargado: string;
  productoA: number;
  varianteA: number;
  sucursalA: number;
};
const API = 'http://127.0.0.1:58127/api/v1';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' && u.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':58127') });
    return ['127.0.0.1', 'localhost'].includes(u.hostname) ? route.continue() : route.abort();
  });
});

async function entrar(page: Page, usuario: string) {
  await page.goto(`/e/${d.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function h(request: APIRequestContext, usuario: string) {
  const r = await request.post(`${API}/autenticacion/login`, {
    data: { identificador: usuario, password: 'Prueba-aislada-123', empresa_codigo: d.a.codigo },
  });
  expect(r.ok()).toBeTruthy();
  return {
    Authorization: `Bearer ${(await r.json()).access_token}`,
    'X-Empresa-Codigo': d.a.codigo,
  };
}
async function prepararCarrito(request: APIRequestContext) {
  const headers = await h(request, d.clienteA);
  await request.delete(`${API}/carrito`, { headers });
  const r = await request.post(`${API}/carrito/items`, {
    headers,
    data: { sucursal_id: d.sucursalA, producto_variante_id: d.varianteA, cantidad: 1 },
  });
  expect(r.ok()).toBeTruthy();
  return headers;
}
async function axe(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

test('CU11 catálogo por sucursal y detalle accesibles para visitante', async ({ page }) => {
  await page.goto(`/e/${d.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/catalogo');
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toBeVisible();
  await axe(page);
  await page.goto(`/producto/${d.productoA}`);
  await expect(page.getByRole('heading', { name: 'Prenda Empresa A', exact: true })).toBeVisible();
  await expect(page.getByLabel('Sucursal para carrito')).toBeVisible();
  await axe(page);
});

test('CU12–CU13 cliente reserva gratis y cancela sin anticipo', async ({ page, request }) => {
  await prepararCarrito(request);
  await entrar(page, d.clienteA);
  await page.goto('/carrito');
  await expect(page.getByText('Reserva gratuita', { exact: true })).toBeVisible();
  const fecha = page.locator('input[type=date]');
  expect(await fecha.getAttribute('max')).toBeTruthy();
  await axe(page);
  await page.getByRole('button', { name: 'Reservar gratis por 7 días' }).click();
  await expect(page).toHaveURL(/\/reservas\/\d+$/);
  await expect(page.getByText('Reserva gratuita · sin anticipo', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pagar anticipo con Stripe' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await axe(page);
  await page.getByRole('button', { name: /Cancelar reserva/i }).click();
  await expect(page.getByText('CANCELADA', { exact: true }).first()).toBeVisible();
});

test('CU13 cajero atiende reserva y emite nota sin completar desde selector', async ({
  page,
  request,
}) => {
  const headers = await prepararCarrito(request);
  const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
  const r = await request.post(`${API}/reservas/desde-carrito`, {
    headers,
    data: { sucursal_id: d.sucursalA, fecha_cita: fecha, clave_operacion: randomUUID() },
  });
  expect(r.ok()).toBeTruthy();
  const reserva = await r.json();
  await entrar(page, d.cajero);
  await page.goto('/reservas-admin');
  const fila = page.getByRole('row').filter({ hasText: reserva.codigo });
  await expect(fila).toBeVisible();
  const estados = fila.getByRole('combobox');
  await expect(estados.locator('option[value=COMPLETADA]')).toHaveCount(0);
  await expect(estados.locator('option[value=CANCELADA]')).toHaveCount(0);
  await estados.selectOption('PREPARADA');
  await expect(fila).toContainText('PREPARADA');
  await estados.selectOption('EN_ATENCION');
  await fila.getByRole('button', { name: 'Ver', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Detalle de la reserva' });
  await expect(dialog).toBeVisible();
  await axe(page);
  await dialog.getByRole('button', { name: 'Finalizar venta presencial' }).click();
  await expect(dialog.getByRole('button', { name: 'Descargar nota de venta PDF' })).toBeVisible();
  const descarga = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar nota de venta PDF' }).click();
  expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('CU14 encargado registra entrada y consulta inventario sin permisos de catálogo administrativo', async ({
  page,
}) => {
  await entrar(page, d.encargado);
  await page.goto('/movimientos-inventario');
  await page.getByText('Registrar movimiento', { exact: true }).first().click();
  await expect(page.getByRole('combobox', { name: 'Prenda', exact: true })).toBeEnabled();
  await page
    .getByRole('combobox', { name: 'Prenda', exact: true })
    .selectOption(String(d.varianteA));
  await page.getByLabel('Cantidad', { exact: true }).fill('3');
  await page.getByLabel('Motivo', { exact: true }).fill('Entrada de prueba CU14');
  await axe(page);
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Movimiento registrado');
  await page.goto('/inventario');
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toBeVisible();
  await axe(page);
});

test('CU15 cajero registra compra identificada y descarga/envía nota de la empresa', async ({
  page,
}) => {
  await entrar(page, d.cajero);
  await page.goto('/venta-presencial');
  await page.getByText('Registrar venta presencial', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Sucursal', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Descuento de esta línea (Bs)')).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Prenda', exact: true })
    .selectOption(String(d.varianteA));
  await page.getByRole('button', { name: 'Agregar prenda', exact: true }).click();
  await page.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption({ index: 1 });
  await axe(page);
  const respuestaVenta = page.waitForResponse(
    (r) => r.url().endsWith('/api/v1/ventas-presenciales') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
  const ventaCreada = (await (await respuestaVenta).json()) as { codigo: string };
  await expect(page.getByRole('status')).toContainText('registrada');
  const fila = page.getByRole('row').filter({ hasText: ventaCreada.codigo });
  const descarga = page.waitForEvent('download');
  await fila.getByRole('button', { name: /Descargar nota de/ }).click();
  expect((await descarga).suggestedFilename()).toMatch(/\.pdf$/);
  await fila.getByRole('button', { name: /Enviar nota de/ }).click();
  await expect(page.getByRole('status')).toContainText('enviada');
});

test('CU14 administrador transfiere unidades entre sucursales con trazabilidad', async ({
  page,
  request,
}) => {
  const headers = await h(request, d.a.codigo);
  const ciudades = await request.get(`${API}/ciudades`, { headers });
  expect(ciudades.ok()).toBeTruthy();
  const nombre = `Destino CU14 ${Date.now()}`;
  const nueva = await request.post(`${API}/sucursales`, {
    headers,
    data: {
      ciudad_id: (await ciudades.json())[0].id,
      nombre,
      direccion: 'Dirección de prueba',
    },
  });
  expect(nueva.ok()).toBeTruthy();
  const destino = await nueva.json();
  await entrar(page, d.a.codigo);
  await page.goto('/transferencias-stock');
  await page.getByText('Registrar transferencia', { exact: true }).first().click();
  await page
    .getByRole('combobox', { name: 'Origen', exact: true })
    .selectOption(String(d.sucursalA));
  await page
    .getByRole('combobox', { name: 'Destino', exact: true })
    .selectOption(String(destino.id));
  await page
    .getByRole('combobox', { name: 'Prenda', exact: true })
    .selectOption(String(d.varianteA));
  await axe(page);
  await page.getByRole('button', { name: 'Registrar transferencia', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('stock actualizado');
  await expect(page.getByRole('row').filter({ hasText: nombre })).toBeVisible();
});

test('CU15 administrador configura condiciones de futuras notas de su empresa', async ({
  page,
}) => {
  await entrar(page, d.a.codigo);
  await page.goto('/venta-presencial');
  await page.getByText('Identidad y condiciones de las notas de venta', { exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Condiciones comerciales', exact: true })
    .fill('Conserve esta nota y consulte las condiciones de Atelier Norte.');
  await axe(page);
  await page.getByRole('button', { name: 'Guardar condiciones', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('futuras notas');
});
