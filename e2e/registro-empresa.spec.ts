import { test, expect, Page, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const d = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { codigo: string };
  as: string;
  plan: number;
  clienteA: string;
};
const API = 'http://127.0.0.1:58127/api/v1';
const PASSWORD = 'Empresa-prueba-123';
test.setTimeout(120000);

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' && u.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':58127') });
    return ['127.0.0.1', 'localhost'].includes(u.hostname) ? route.continue() : route.abort();
  });
});

async function plataforma(page: Page) {
  await page.goto('/saas/login');
  await page.getByLabel('Usuario o correo').fill(d.as);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-AS-local-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/saas\/empresas$/, { timeout: 25000 });
}
async function publicar(request: APIRequestContext, publico: boolean) {
  const sesion = await request.post(API + '/autenticacion/login', {
    data: {
      identificador: d.as,
      password: 'Prueba-AS-local-123',
      empresa_codigo: null,
    },
  });
  expect(sesion.ok()).toBeTruthy();
  const headers = { Authorization: 'Bearer ' + (await sesion.json()).access_token };
  const planes = await request.get(API + '/saas/planes', { headers });
  const plan = (
    (await planes.json()) as {
      id: number;
      codigo: string;
      nombre: string;
      limites: object;
      funciones: object;
    }[]
  ).find((p) => p.id === d.plan)!;
  const r = await request.put(API + '/saas/planes/' + d.plan, {
    headers,
    data: { ...plan, activo: true, publico },
  });
  expect(r.ok()).toBeTruthy();
  return plan;
}
async function completar(page: Page) {
  const codigo = 'web-' + randomUUID().slice(0, 8);
  await page.locator('#registro-plan-' + d.plan).check();
  await page.getByLabel('Nombre de la empresa', { exact: true }).fill('Empresa ' + codigo);
  await page.getByLabel('Identificador público', { exact: true }).fill(codigo);
  await page.getByLabel('Nombre', { exact: true }).fill('Ana');
  await page.getByLabel('Apellido', { exact: true }).fill('Prueba');
  await page.getByLabel('Usuario', { exact: true }).fill('admin_' + codigo.slice(4));
  await page.getByLabel('Correo de contacto', { exact: true }).fill(codigo + '@example.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(PASSWORD);
  return codigo;
}
async function axe(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

test('AS publica un plan para el registro sin publicar el plan de transición', async ({
  page,
  request,
}) => {
  const plan = await publicar(request, false);
  await plataforma(page);
  await page.goto('/saas/planes');
  await page
    .getByRole('row')
    .filter({ hasText: plan.codigo })
    .getByRole('button', { name: 'Editar plan Prueba', exact: true })
    .click();
  await page.getByLabel('Disponible en el registro de empresas', { exact: true }).check();
  await axe(page);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Guardar plan', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Plan guardado.' })).toBeVisible();
  const planes = await request.get(API + '/empresas/registro/planes');
  expect(((await planes.json()) as { id: number }[]).some((p) => p.id === d.plan)).toBeTruthy();
});

test('registro sin correo verificado queda oculto; AS aprueba y habilita su administrador', async ({
  page,
  request,
}) => {
  await page.goto('/empresa');
  await page.getByRole('link', { name: 'Crear mi empresa', exact: true }).click();
  await expect(page).toHaveURL(/\/crear-empresa$/);
  const codigo = await completar(page);
  await axe(page);
  await page.screenshot({ path: 'test-results/registro-empresa-formulario.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await axe(page);
  await page.screenshot({
    path: 'test-results/registro-empresa-formulario-movil.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  const respuesta = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/empresas/registro'),
  );
  await page.getByRole('button', { name: 'Solicitar registro de empresa', exact: true }).click();
  const r = await respuesta;
  expect(r.status()).toBe(201);
  expect(r.request().headers()['authorization']).toBeUndefined();
  expect(r.request().headers()['x-empresa-codigo']).toBeUndefined();
  const empresa = (await r.json()).empresa as { id: number; codigo: string };
  await expect(page.getByRole('status')).toContainText('pendiente de aprobación');
  await axe(page);
  expect((await request.get(API + '/empresas/publica/' + codigo)).status()).toBe(404);
  const acceso = {
    identificador: 'admin_' + codigo.slice(4),
    password: PASSWORD,
    empresa_codigo: codigo,
  };
  expect((await request.post(API + '/autenticacion/login', { data: acceso })).status()).toBe(401);
  const correos = JSON.parse(readFileSync('e2e/.correos.json', 'utf8')) as Record<string, string>;
  expect(correos[codigo + '@example.invalid']).toBeUndefined();
  await plataforma(page);
  await page
    .getByRole('row')
    .filter({ hasText: 'Empresa ' + codigo })
    .getByRole('button', { name: 'Configurar Empresa ' + codigo, exact: true })
    .click();
  const config = page.getByRole('region', { name: 'Configurar Empresa ' + codigo, exact: true });
  await expect(config).toContainText('correo no fue verificado');
  await expect(
    config.getByRole('combobox', { name: 'Plan', exact: true }).locator('option:checked'),
  ).toContainText('Prueba');
  await axe(page);
  const aprobacion = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      r.url().endsWith(`/saas/empresas/${empresa.id}/suscripcion`),
  );
  await config.getByRole('button', { name: 'Aprobar y activar empresa', exact: true }).click();
  expect((await (await aprobacion).json()).plan_id).toBe(d.plan);
  await expect(
    page.getByRole('status').filter({ hasText: 'Empresa aprobada y suscripción activada.' }),
  ).toBeVisible();
  expect((await request.get(API + '/empresas/publica/' + codigo)).status()).toBe(200);
  const login = await request.post(API + '/autenticacion/login', { data: acceso });
  expect(login.ok()).toBeTruthy();
  const cuenta = await login.json();
  expect(cuenta.empresa_id).toBe(empresa.id);
  expect(cuenta.roles).toEqual(['ADMINISTRADOR']);
});

test('respuesta perdida se reintenta sin duplicar ni cambiar la sesión de otra tienda', async ({
  page,
  request,
}) => {
  await publicar(request, true);
  await page.goto('/e/' + d.a.codigo);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(d.clienteA);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/crear-empresa');
  const codigo = await completar(page);
  const claves: string[] = [];
  let empresaId: number | undefined;
  await page.route('**/api/v1/empresas/registro', async (route) => {
    const request = route.request();
    expect(request.headers()['authorization']).toBeUndefined();
    expect(request.headers()['x-empresa-codigo']).toBeUndefined();
    claves.push((request.postDataJSON() as { clave_solicitud: string }).clave_solicitud);
    const r = await route.fetch({ url: request.url().replace(':8000', ':58127') });
    expect(r.ok()).toBeTruthy();
    const cuerpo = await r.json();
    if (claves.length === 1) {
      empresaId = cuerpo.empresa.id;
      await route.abort();
    } else {
      expect(cuerpo.empresa.id).toBe(empresaId);
      await route.fulfill({ response: r });
    }
  });
  const enviar = page.getByRole('button', { name: 'Solicitar registro de empresa', exact: true });
  await enviar.click();
  await expect(page.getByRole('alert')).toBeVisible();
  await enviar.click();
  await expect(page.getByRole('status')).toContainText('pendiente de aprobación');
  expect(claves).toHaveLength(2);
  expect(claves[0]).toBe(claves[1]);
  await page.goto('/perfil');
  await expect(page.locator('.profile-handle')).toContainText('@' + d.clienteA);
  expect((await request.get(API + '/empresas/publica/' + codigo)).status()).toBe(404);
});

test('sin planes públicos muestra un estado accesible en pantalla estrecha', async ({
  page,
  request,
}) => {
  await publicar(request, false);
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/crear-empresa');
    await expect(
      page.getByRole('heading', { name: 'No hay planes disponibles para registro' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solicitar registro de empresa' })).toHaveCount(
      0,
    );
    await axe(page);
  } finally {
    await publicar(request, true);
  }
});
