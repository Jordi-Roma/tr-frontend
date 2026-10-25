import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const datos = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { codigo: string }; b: { codigo: string }; encargado: string; productoA: number;
};
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
});

async function entrar(page: Page, codigo: string, usuario = codigo) {
  await page.goto(`/e/${codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function accesible(page: Page) {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
}

test('CU07: AD crea cuenta y empleado, edita y reactiva con su rol laboral', async ({ page }) => {
  await entrar(page, datos.a.codigo);
  await page.goto('/empleados');
  await expect(page.getByRole('heading', { name: 'Gestión de empleados' })).toBeVisible();
  await accesible(page);
  await page.getByRole('button', { name: 'Nuevo empleado', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre', { exact: true }).fill('Empleado CU07');
  await dialog.getByLabel('Apellido', { exact: true }).fill('Navegador');
  await dialog.getByLabel('Usuario', { exact: true }).fill('cu07web'+sello);
  await dialog.getByLabel('Correo', { exact: true }).fill(`cu07${sello}@example.invalid`);
  await dialog.getByLabel('Contraseña inicial').fill('Prueba-aislada-123');
  await dialog.getByLabel('Sucursal', { exact: true }).selectOption({ label: 'Centro - Ciudad de prueba' });
  await dialog.getByLabel('Código de empleado').fill('CW'+sello);
  await dialog.getByLabel('Cargo', { exact: true }).fill('Ventas');
  await dialog.getByLabel('Rol laboral').selectOption('CAJERO');
  await accesible(page);
  await dialog.getByRole('button', { name: 'Crear empleado', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: 'cu07web'+sello });
  await expect(fila).toBeVisible();
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await dialog.getByLabel('Cargo', { exact: true }).fill('Asesor comercial');
  await dialog.getByRole('button', { name: 'Guardar empleado', exact: true }).click();
  await expect(fila).toContainText('Asesor comercial');
  await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(fila.getByText('Inactivo', { exact: true })).toBeVisible();
  await fila.getByRole('button', { name: 'Activar', exact: true }).click();
  await expect(dialog.getByLabel('Rol laboral')).toHaveValue('CAJERO');
  await dialog.getByRole('button', { name: 'Confirmar reactivación' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(fila.getByText('Activo', { exact: true })).toBeVisible();
});

test('CU07: encargado accede a la consulta sin controles de modificación', async ({ page }) => {
  await entrar(page, datos.a.codigo, datos.encargado);
  await page.goto('/empleados');
  await expect(page.getByRole('heading', { name: 'Gestión de empleados' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo empleado', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'Solo consulta', exact: true }).first()).toBeVisible();
  await accesible(page);
});

test('CU08: AD crea proveedor, cuenta y vínculo comercial desde la web', async ({ page }) => {
  await entrar(page, datos.a.codigo);
  await page.goto('/proveedores');
  await expect(page.getByRole('heading', { name: 'Gestión de proveedores' })).toBeVisible();
  await accesible(page);
  await page.getByRole('button', { name: 'Nuevo proveedor', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre', { exact: true }).fill('Proveedor CU08 '+sello);
  await dialog.getByLabel('NIT / Documento tributario').fill('P'+sello);
  await dialog.getByRole('button', { name: 'Crear proveedor', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: 'Proveedor CU08 '+sello });
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await dialog.getByLabel('Nombre de la cuenta').fill('Cuenta proveedor');
  await dialog.getByLabel('Apellido de la cuenta').fill('CU08');
  await dialog.getByLabel('Usuario de acceso').fill('proveedorweb'+sello);
  await dialog.getByLabel('Correo de acceso').fill(`proveedor${sello}@example.invalid`);
  await dialog.getByLabel('Contraseña inicial').fill('Prueba-aislada-123');
  await accesible(page);
  await dialog.getByRole('button', { name: 'Crear cuenta vinculada' }).click();
  await expect(dialog.getByText(/@proveedorweb/)).toBeVisible();
  await dialog.getByLabel('Producto para vincular').selectOption({ label: 'Prenda Empresa A' });
  await dialog.getByRole('button', { name: 'Vincular producto', exact: true }).click();
  await expect(dialog.getByRole('listitem').filter({ hasText: 'Prenda Empresa A' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(fila.getByText('Inactivo', { exact: true })).toBeVisible();
  await fila.getByRole('button', { name: 'Activar', exact: true }).click();
  await expect(fila.getByText('Activo', { exact: true })).toBeVisible();
});

test('CU08: proveedor consulta panel propio y la web rechaza gestionar empleados', async ({ page, request }) => {
  const base = 'http://127.0.0.1:58127/api/v1';
  const inicio = await request.post(base+'/autenticacion/login', { data: { identificador: datos.a.codigo, password: 'Prueba-aislada-123', empresa_codigo: datos.a.codigo } });
  const headers = { Authorization: 'Bearer '+(await inicio.json()).access_token, 'X-Empresa-Codigo': datos.a.codigo };
  const p = await request.post(base+'/proveedores', { headers, data: { nombre: 'Panel web '+sello } });
  const pid = (await p.json()).id;
  const usuario = 'panelweb'+sello;
  const cuenta = await request.post(`${base}/proveedores/${pid}/crear-usuario`, { headers, data: { nombre: 'Panel', apellido: 'Web', username: usuario, correo: usuario+'@example.invalid', password: 'Prueba-aislada-123' } });
  expect(cuenta.ok(), await cuenta.text()).toBeTruthy();
  expect((await request.post(`${base}/proveedores/${pid}/productos`, { headers, data: { producto_id: datos.productoA } })).ok()).toBeTruthy();
  await entrar(page, datos.a.codigo, usuario);
  await page.goto('/panel-proveedor');
  await expect(page.getByRole('heading', { name: 'Panel web '+sello })).toBeVisible();
  await accesible(page);
  await page.getByRole('button', { name: 'Mis productos', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Prenda Empresa A', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Prenda Empresa B', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Stock', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Prenda Empresa A', exact: true })).toBeVisible();
  await page.goto('/empleados');
  await expect(page).toHaveURL(/\/403$/);
});
