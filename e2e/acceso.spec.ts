import { test, expect, Page, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const datos = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { id: number; codigo: string; nombre: string };
  b: { id: number; codigo: string; nombre: string };
  as: string;
};
const API = 'http://127.0.0.1:58127/api/v1';
const PASSWORD = 'Prueba-aislada-123';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === '8000') {
      return route.continue({ url: route.request().url().replace(':8000', ':58127') });
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

async function entrar(page: Page, plataforma = false) {
  if (!plataforma) {
    await page.goto(`/e/${datos.a.codigo}`);
    await expect(page).toHaveURL(/\/inicio$/);
  }
  await page.goto(plataforma ? '/saas/login' : '/login');
  await page.getByLabel('Usuario o correo').fill(plataforma ? datos.as : datos.a.codigo);
  await page
    .getByLabel('Contrasena', { exact: true })
    .fill(plataforma ? 'Prueba-AS-local-123' : PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function accesible(page: Page, captura: string) {
  const resultado = await new AxeBuilder({ page }).analyze();
  expect(
    resultado.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.screenshot({ path: `test-results/cu04-${captura}.png`, fullPage: true });
}

async function crear(page: Page, rol = 'CLIENTE') {
  const username = 'acceso_' + Date.now();
  await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await page.getByLabel('Nombre', { exact: true }).fill('Cuenta Acceso');
  await page.getByLabel('Apellido', { exact: true }).fill('Prueba');
  await page.getByLabel('Nombre de usuario', { exact: true }).fill(username);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(username + '@example.invalid');
  await page.getByLabel('Contraseña inicial').fill(PASSWORD);
  await page.getByLabel('Rol inicial').selectOption({ label: rol });
  await accesible(page, 'formulario-' + rol.toLowerCase());
  await page.getByRole('button', { name: 'Guardar cuenta', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Cuenta guardada');
  return username;
}

async function buscar(page: Page, username: string, estado = 'TODOS') {
  await page.getByLabel('Buscar usuario', { exact: true }).fill(username);
  await page.getByLabel('Estado', { exact: true }).selectOption(estado);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const fila = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: username, exact: true }) });
  await expect(fila).toBeVisible();
  return fila;
}

async function tokenAS(request: APIRequestContext) {
  const r = await request.post(`${API}/autenticacion/login`, {
    data: { identificador: datos.as, password: 'Prueba-AS-local-123', empresa_codigo: null },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  return { Authorization: `Bearer ${(await r.json()).access_token}` };
}

test('enlaces SaaS sin sesión llevan al acceso de plataforma', async ({ page }) => {
  for (const ruta of ['/saas/usuarios', '/saas/bitacora']) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/saas\/login\?returnUrl=/);
    await expect(
      page.getByRole('heading', { name: 'Administración de plataforma', exact: true }),
    ).toBeVisible();
  }
});

test('AS descarta respuestas antiguas al seleccionar otra empresa', async ({ page }) => {
  await entrar(page, true);
  await page.goto('/saas/usuarios');
  await expect(page.getByRole('cell', { name: datos.as, exact: true })).toBeVisible();
  let liberar!: () => void;
  const espera = new Promise<void>((resolve) => (liberar = resolve));
  let recibida!: () => void;
  const recibio = new Promise<void>((resolve) => (recibida = resolve));
  await page.route('**/api/v1/saas/usuarios?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('empresa_id') !== String(datos.a.id))
      return route.fallback();
    const response = await route.fetch({ url: route.request().url().replace(':8000', ':58127') });
    recibida();
    await espera;
    await route.fulfill({ response }).catch(() => {});
  });
  await page
    .getByLabel('Ámbito de las cuentas')
    .selectOption({ label: 'Administradores de ' + datos.a.nombre });
  await recibio;
  await expect(page.getByRole('cell', { name: datos.as, exact: true })).toHaveCount(0);
  await page
    .getByLabel('Ámbito de las cuentas')
    .selectOption({ label: 'Administradores de ' + datos.b.nombre });
  await expect(page.getByRole('cell', { name: datos.b.codigo, exact: true })).toBeVisible();
  liberar();
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByRole('cell', { name: datos.b.codigo, exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: datos.a.codigo, exact: true })).toHaveCount(0);
});

test('AD crea, edita, desactiva y reactiva sin perder historial; teclado y AXE', async ({
  page,
}) => {
  await entrar(page);
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible();
  const nombre = await crear(page);
  let fila = await buscar(page, nombre);
  await fila.getByRole('button', { name: 'Editar ' + nombre, exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Cuenta Editada');
  await page.getByRole('button', { name: 'Guardar cuenta', exact: true }).click();
  await expect(fila).toContainText('Cuenta Editada');
  await fila.getByRole('button', { name: 'Desactivar ' + nombre, exact: true }).click();
  await accesible(page, 'confirmacion-baja');
  await page.getByRole('button', { name: 'Confirmar desactivación', exact: true }).click();
  fila = await buscar(page, nombre, 'INACTIVOS');
  await expect(fila).toContainText('Inactivo');
  await fila.getByRole('button', { name: 'Reactivar ' + nombre, exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar reactivación', exact: true }).click();
  fila = await buscar(page, nombre, 'ACTIVOS');
  await expect(fila).toContainText('Activo');
  await page.setViewportSize({ width: 390, height: 844 });
  await accesible(page, 'usuarios-movil');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await fila.getByRole('button', { name: 'Editar ' + nombre, exact: true }).click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Guardar cuenta', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(fila.getByRole('button', { name: 'Editar ' + nombre, exact: true })).toBeFocused();
});

test('AD asigna y retira un rol y exige vínculo de empleado', async ({ page }) => {
  await entrar(page);
  await page.goto('/usuarios');
  const nombre = await crear(page);
  const fila = await buscar(page, nombre);
  await fila.getByRole('button', { name: 'Roles de ' + nombre }).click();
  await page.getByLabel('Rol comercial o de plataforma').selectOption({ label: 'CAJERO' });
  await page.getByRole('button', { name: 'Asignar o reactivar rol' }).click();
  await expect(page.getByRole('alert')).toContainText('Empleados');
  await page.getByLabel('Rol comercial o de plataforma').selectOption({ label: 'ADMINISTRADOR' });
  await accesible(page, 'asignacion-rol');
  await page.getByRole('button', { name: 'Asignar o reactivar rol' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(fila).toContainText('ADMINISTRADOR');
  await fila.getByRole('button', { name: 'Roles de ' + nombre }).click();
  await page.getByLabel('Rol comercial o de plataforma').selectOption({ label: 'ADMINISTRADOR' });
  await page.getByRole('button', { name: 'Retirar rol', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(fila).not.toContainText('ADMINISTRADOR');
  await expect(fila).toContainText('CLIENTE');
});

test('AD consulta roles protegidos y bitácora real con filtros y detalle', async ({ page }) => {
  await entrar(page);
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Ver permisos de ADMINISTRADOR', exact: true }).click();
  const casillas = page.getByRole('checkbox');
  expect(await casillas.count()).toBeGreaterThan(9);
  for (const c of await casillas.all()) await expect(c).toBeDisabled();
  await accesible(page, 'roles-consulta');
  await page.keyboard.press('Escape');
  await page.goto('/bitacora');
  await expect(page.getByRole('heading', { name: 'Bitácora del sistema' })).toBeVisible();
  await page.getByLabel('Acción', { exact: true }).fill('INICIO_SESION');
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  const detalle = page.getByRole('button', { name: /Ver detalle del registro \d+/ }).first();
  await expect(detalle).toBeVisible();
  await accesible(page, 'bitacora-ad');
  await detalle.click();
  await expect(page.getByRole('dialog')).toContainText('INICIO_SESION');
  await expect(page.getByRole('dialog')).toContainText('Cuenta objetivo');
  await accesible(page, 'detalle-bitacora');
  await page.keyboard.press('Escape');
  await page.getByLabel('Fecha desde', { exact: true }).fill('2026-10-24');
  await page.getByLabel('Fecha hasta', { exact: true }).fill('2026-10-23');
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('fecha');
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('AS separa cuentas de plataforma y administradores de empresa; bitácora propia', async ({
  page,
}) => {
  await entrar(page, true);
  await page.goto('/saas/usuarios');
  await expect(page.getByRole('heading', { name: 'Cuentas de acceso', exact: true })).toBeVisible();
  const nombre = await crear(page, 'ADMIN_SAAS');
  await buscar(page, nombre);
  await page.getByLabel('Buscar usuario', { exact: true }).fill('');
  await page
    .getByLabel('Ámbito de las cuentas')
    .selectOption({ label: 'Administradores de ' + datos.a.nombre });
  await expect(page.getByRole('cell', { name: datos.a.codigo, exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: nombre, exact: true })).toHaveCount(0);
  const admin = await crear(page, 'ADMINISTRADOR');
  await buscar(page, admin);
  await accesible(page, 'as-cuentas-empresa');
  await page.goto('/saas/bitacora');
  await page.getByLabel('Acción', { exact: true }).fill('CREAR_USUARIO');
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Ver detalle del registro \d+/ }).first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /Ver detalle del registro \d+/ })
    .first()
    .click();
  await expect(page.getByRole('dialog').locator('dt:has-text("Empresa afectada") + dd')).toHaveText(
    String(datos.a.id),
  );
  await accesible(page, 'as-bitacora');
});

test('AS cambia permiso global, AD pierde operación y recupera acceso al reponerlo', async ({
  page,
  request,
  browser,
}) => {
  const headers = await tokenAS(request);
  const catalogo = await (await request.get(`${API}/acceso/catalogos`, { headers })).json();
  const rol = catalogo.roles.find((r: { nombre: string }) => r.nombre === 'ADMINISTRADOR');
  const permiso = catalogo.permisos.find((p: { accion: string }) => p.accion === 'usuarios:ver');
  const contexto = await browser.newContext();
  const ad = await contexto.newPage();
  await ad.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':58127') });
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  try {
    await entrar(ad);
    const token = await ad.evaluate(() => localStorage.getItem('backend_tr_token'));
    await entrar(page, true);
    await page.goto('/roles');
    await page.getByRole('button', { name: 'Ver permisos de ADMINISTRADOR', exact: true }).click();
    const editable = page.locator('#permiso-' + permiso.id);
    await expect(editable).toBeEnabled();
    await editable.uncheck();
    await expect(page.getByRole('button', { name: 'Guardar permisos globales' })).toBeDisabled();
    await page
      .getByLabel('Confirmo que el cambio de permisos afecta a todas las empresas.')
      .check();
    await accesible(page, 'permisos-globales');
    await page.getByRole('button', { name: 'Guardar permisos globales' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(
      (
        await request.get(`${API}/usuarios`, { headers: { Authorization: `Bearer ${token}` } })
      ).status(),
    ).toBe(401);
    await ad.goto('/usuarios');
    await expect(ad).toHaveURL(/\/login/);
    await ad.getByLabel('Usuario o correo').fill(datos.a.codigo);
    await ad.getByLabel('Contrasena', { exact: true }).fill(PASSWORD);
    await ad.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(ad).toHaveURL(/\/403$/);
    const nuevoToken = await ad.evaluate(() => localStorage.getItem('backend_tr_token'));
    expect(
      (
        await request.get(`${API}/usuarios/paginados`, {
          headers: { Authorization: `Bearer ${nuevoToken}` },
        })
      ).status(),
    ).toBe(403);
  } finally {
    const restaurar = await request.put(`${API}/roles/${rol.id}/permisos`, {
      headers,
      data: { permiso_ids: rol.permiso_ids, confirmar_global: true },
    });
    expect(restaurar.ok(), await restaurar.text()).toBeTruthy();
    await contexto.close();
  }
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Ver permisos de ADMINISTRADOR', exact: true }).click();
  await expect(page.locator('#permiso-' + permiso.id)).toBeChecked();
});

test('error de detalle se informa y puede reintentarse sin inventar datos', async ({ page }) => {
  await entrar(page);
  await page.goto('/bitacora');
  let fallo = true;
  await page.route(/\/api\/v1\/bitacora\/\d+$/, (route) =>
    fallo
      ? route.fulfill({ status: 503, json: { detail: 'Detalle no disponible' } })
      : route.fallback(),
  );
  await page
    .getByRole('button', { name: /Ver detalle del registro \d+/ })
    .first()
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Detalle no disponible');
  await expect(page.getByRole('dialog').getByText('Cuenta objetivo', { exact: true })).toHaveCount(
    0,
  );
  await accesible(page, 'error-detalle');
  await page.keyboard.press('Escape');
  fallo = false;
  await page
    .getByRole('button', { name: /Ver detalle del registro \d+/ })
    .first()
    .click();
  await expect(
    page.getByRole('dialog').getByText('Cuenta objetivo', { exact: true }),
  ).toBeVisible();
});
