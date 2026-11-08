import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as { a: { codigo: string }; clienteA: string; encargado: string; sucursalA: number; varianteA: number };
const api = 'http://127.0.0.1:18127/api/v1';
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async r => { const u = new URL(r.request().url()); if (u.hostname === '127.0.0.1' && u.port === '8000') return r.continue({ url: r.request().url().replace(':8000', ':18127') }); if (['127.0.0.1', 'localhost'].includes(u.hostname)) return r.continue(); return r.abort(); });
  page.on('dialog', r => r.accept());
});
async function entrar(page: Page, usuario: string) {
  await page.goto('/e/' + d.a.codigo); await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login'); await page.getByLabel('Usuario o correo').fill(usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click(); await expect(page).not.toHaveURL(/\/login$/);
}
async function cambiar(page: Page, usuario: string) { await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await entrar(page, usuario); }
async function axe(page: Page) { expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); }
test('política por empresa, inspección no vendible, aceptación y reintegro original', async ({ page, request }) => {
  test.setTimeout(120000);
  async function acceso(usuario: string) { const r = await request.post(api + '/autenticacion/login', { data: { identificador: usuario, password: 'Prueba-aislada-123', empresa_codigo: d.a.codigo } }); expect(r.ok()).toBeTruthy(); return { Authorization: 'Bearer ' + (await r.json()).access_token, 'X-Empresa-Codigo': d.a.codigo }; }
  const ha = await acceso(d.a.codigo), hc = await acceso(d.clienteA);
  await entrar(page, d.a.codigo); await page.goto('/politicas-posventa');
  await page.getByLabel('Habilitar devoluciones', { exact: true }).check();
  await page.getByLabel('Plazo de devoluciones (días desde la compra)').fill('15');
  await page.getByLabel('Condiciones de devoluciones', { exact: true }).fill('Con revisión del estado de las prendas.');
  await page.getByRole('button', { name: 'Guardar política', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Política guardada'); await axe(page);
  const cfg = await (await request.get(api + '/pagos-empresa/configuracion', { headers: ha })).json();
  expect((await request.put(api + '/pagos-empresa/configuracion', { headers: ha, data: { version: cfg.version, qr_habilitado: true } })).ok()).toBeTruthy();
  await request.delete(api + '/carrito', { headers: hc });
  expect((await request.post(api + '/carrito/items', { headers: hc, data: { producto_variante_id: d.varianteA, sucursal_id: d.sucursalA, cantidad: 1 } })).ok()).toBeTruthy();
  const pago = await request.post(api + '/pagos/qr/checkout', { headers: hc, data: { sucursal_id: d.sucursalA, clave_operacion: crypto.randomUUID() } });
  expect(pago.ok(), await pago.text()).toBeTruthy(); const orden = await pago.json();
  expect((await request.post(api + '/pagos/qr/confirmar/' + orden.orden_id, { headers: hc })).ok()).toBeTruthy();
  await cambiar(page, d.clienteA); await page.goto('/mis-devoluciones');
  await page.getByRole('button', { name: 'Solicitar devolución', exact: true }).first().click();
  await page.getByRole('spinbutton', { name: 'Cantidad a devolver' }).fill('1');
  await page.getByLabel('Motivo', { exact: true }).fill('La costura presenta una falla');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  await expect(page.getByText('Solicitud enviada.', { exact: true })).toBeVisible(); await axe(page);
  await cambiar(page, d.encargado); await page.goto('/devoluciones');
  await page.getByRole('button', { name: 'Gestionar', exact: true }).first().click();
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await page.getByLabel('No vendibles', { exact: true }).fill('1');
  await page.getByLabel('Nota de gestión / rechazo', { exact: true }).fill('Costura dañada, no disponible para venta');
  await page.getByRole('button', { name: 'Registrar recepción e inspección', exact: true }).click();
  await expect(page.locator('.management-panel .status')).toHaveText('ESPERA ACEPTACION'); await axe(page);
  await cambiar(page, d.clienteA); await page.goto('/mis-devoluciones');
  await page.getByRole('button', { name: 'Ver detalle', exact: true }).first().click();
  await page.getByRole('button', { name: 'Aceptar devolución e importe', exact: true }).click();
  await expect(page.locator('.management-panel')).toContainText('Comprobante'); await axe(page);
  await cambiar(page, d.encargado); await page.goto('/devoluciones');
  await page.getByRole('button', { name: 'Gestionar', exact: true }).first().click();
  await page.getByRole('button', { name: 'Procesar / reintentar reintegro original', exact: true }).click();
  await expect(page.locator('.management-panel')).toContainText('Reembolso confirmado. QR'); await axe(page);
});


