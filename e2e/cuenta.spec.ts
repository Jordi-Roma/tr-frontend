import { test, expect, Page, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const datos = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { id: number; codigo: string; nombre: string };
};
const API = 'http://127.0.0.1:58127/api/v1';
const PASSWORD = 'Prueba-aislada-123';
const NUEVA = 'Cuenta-nueva-segura-456';

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

async function cuenta(request: APIRequestContext) {
  const nombre = 'cuenta' + Date.now() + Math.floor(Math.random() * 10000);
  const r = await request.post(`${API}/autenticacion/registro`, {
    data: {
      nombre: 'Cliente',
      apellido: 'Cuenta',
      username: nombre,
      correo: nombre + '@example.invalid',
      password: PASSWORD,
      empresa_codigo: datos.a.codigo,
    },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  return nombre;
}
async function entrar(page: Page, usuario: string, password = PASSWORD) {
  await page.goto(`/e/${datos.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}
async function accesible(page: Page) {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
}
async function abrirPerfil(page: Page) {
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Configurar perfil' })).toBeVisible();
  await expect(page.locator('.profile-handle')).not.toBeEmpty();
}

test('perfil personal y direcciones se guardan; formularios accesibles', async ({
  page,
  request,
}) => {
  const nombre = await cuenta(request);
  await entrar(page, nombre);
  await abrirPerfil(page);
  await accesible(page);
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Editar perfil', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Cliente Editado');
  await page.getByLabel('Telefono', { exact: true }).fill('70123456');
  await accesible(page);
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Perfil actualizado');
  await expect(page.locator('.avatar-card')).toContainText('Cliente Editado');
  await page.screenshot({ path: 'test-results/qa-cuenta-perfil.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.avatar-card')).toContainText('Cliente Editado');
  await page.getByRole('button', { name: 'Nueva dirección' }).click();
  await page.getByLabel('Ciudad', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Dirección', { exact: true }).fill('Calle E2E 123');
  await page.getByLabel('Marcar como dirección principal').check();
  await accesible(page);
  await page.getByRole('button', { name: 'Crear dirección', exact: true }).click();
  const tarjeta = page.locator('.address-card').filter({ hasText: 'Calle E2E 123' });
  await expect(tarjeta).toContainText('Principal');
  await tarjeta.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Dirección', { exact: true }).fill('Calle E2E 456');
  await page.getByRole('button', { name: 'Guardar dirección', exact: true }).click();
  await expect(page.locator('.address-card')).toContainText('Calle E2E 456');
  await page
    .locator('.address-card')
    .getByRole('button', { name: 'Desactivar', exact: true })
    .click();
  await expect(page.getByText('No tienes direcciones registradas.')).toBeVisible();
});

test('usuario y correo requieren contraseña y un nuevo ingreso', async ({ page, request }) => {
  const nombre = await cuenta(request);
  await entrar(page, nombre);
  await abrirPerfil(page);
  await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
  await page.getByLabel('Nombre de usuario', { exact: true }).fill(nombre + 'x');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(nombre + 'x@example.invalid');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('contraseña actual');
  await page.getByLabel('Contraseña actual para cambiar usuario o correo').fill(PASSWORD);
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page).toHaveURL(/login\?motivo=acceso_actualizado/);
  await expect(page.getByRole('status')).toContainText('actualizados');
  await entrar(page, nombre + 'x');
  await abrirPerfil(page);
  await expect(page.locator('.profile-handle')).toContainText(nombre + 'x@example.invalid');
});

test('contraseña nueva cierra la sesión y permite ingresar de nuevo', async ({ page, request }) => {
  const nombre = await cuenta(request);
  await entrar(page, nombre);
  await abrirPerfil(page);
  await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
  await page.getByLabel('Contraseña actual', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(NUEVA);
  await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill(NUEVA);
  await accesible(page);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cambiar contraseña', exact: true })
    .click();
  await expect(page).toHaveURL(/login\?motivo=clave_actualizada/);
  await entrar(page, nombre, NUEVA);
});

test('recuperación real con código de correo capturado sólo en fixture', async ({
  page,
  request,
}) => {
  const nombre = await cuenta(request);
  await page.goto(`/e/${datos.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/recuperar-password');
  await page.getByLabel('Usuario o correo').fill(nombre);
  await page.getByRole('button', { name: 'Enviar código', exact: true }).click();
  await expect(page.getByLabel('Código recibido')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('correo registrado');
  const correos = JSON.parse(readFileSync('e2e/.correos.json', 'utf8')) as Record<string, string>;
  await page.getByLabel('Código recibido').fill(correos[nombre + '@example.invalid']);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(NUEVA);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(NUEVA);
  await accesible(page);
  await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
  await expect(page).toHaveURL(/login\?motivo=clave_actualizada/);
  await entrar(page, nombre, NUEVA);
});

test('desactivación requiere confirmación y bloquea un nuevo ingreso', async ({
  page,
  request,
}) => {
  const nombre = await cuenta(request);
  await entrar(page, nombre);
  await abrirPerfil(page);
  const boton = page.getByRole('button', { name: 'Confirmar desactivación de mi cuenta' });
  await expect(boton).toBeDisabled();
  await page.getByLabel('Contraseña actual para desactivar', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Entiendo que perderé el acceso').check();
  await accesible(page);
  await boton.click();
  await expect(page).toHaveURL(/login\?motivo=cuenta_desactivada/);
  await expect(page.getByRole('status')).toContainText('historial');
  await page.getByLabel('Usuario o correo').fill(nombre);
  await page.getByLabel('Contrasena', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('inactivo');
});

test('recuperación SaaS se mantiene separada del negocio y accesible', async ({ page }) => {
  await page.goto('/saas/login');
  await page.getByRole('link', { name: /contraseña|contrasena/i }).click();
  await expect(page).toHaveURL(/\/saas\/recuperar-password$/);
  await expect(page.getByText('Administración de la plataforma StyleAR')).toBeVisible();
  await accesible(page);
});
