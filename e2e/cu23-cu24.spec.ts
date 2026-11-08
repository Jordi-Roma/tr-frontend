import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const f = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { codigo: string };
  b: { codigo: string };
  clienteA: string;
  clienteB: string;
  productoA: number;
  productoB: number;
};
const API = 'http://127.0.0.1:18127/api/v1';
test('CU23–CU24: favoritos conservados, precio promocionado, contexto y selección explícita de reserva', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  await page.route('**/*', (r) => {
    const u = new URL(r.request().url());
    return u.hostname === '127.0.0.1' && u.port === '8000'
      ? r.continue({ url: r.request().url().replace(':8000', ':18127') })
      : ['127.0.0.1', 'localhost'].includes(u.hostname)
        ? r.continue()
        : r.abort();
  });
  const login = await request.post(API + '/autenticacion/login', {
    data: { identificador: f.clienteA, password: 'Prueba-aislada-123', empresa_codigo: f.a.codigo },
  });
  expect(login.ok()).toBeTruthy();
  const headers = {
    Authorization: 'Bearer ' + (await login.json()).access_token,
    'X-Empresa-Codigo': f.a.codigo,
  };
  expect(
    (
      await request.put(API + '/recomendaciones/favoritos/' + f.productoA, { headers, data: {} })
    ).ok(),
  ).toBeTruthy();
  await page.goto('/e/' + f.a.codigo);
  await page.getByRole('link', { name: 'Ingresar', exact: true }).click();
  await page.getByLabel('Usuario o correo').fill(f.clienteA);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/para-ti');
  const personal = page.getByRole('checkbox', {
    name: 'Usar mis favoritos, compras y gustos para «Para ti»',
  });
  await expect(personal).toBeEnabled();
  await personal.uncheck();
  await page.getByRole('button', { name: 'Guardar preferencias', exact: true }).click();
  await expect(page.getByText('Preferencias guardadas.')).toBeVisible();
  await expect(
    page.getByText(
      'La personalización está desactivada. Tus favoritos se conservan y puedes consultarlos.',
    ),
  ).toBeVisible();
  expect(
    (await (await request.get(API + '/recomendaciones/favoritos', { headers })).json()).some(
      (p: { producto_id: number }) => p.producto_id === f.productoA,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.goto('/producto/' + f.productoA);
  await page.getByRole('button', { name: 'Consultar esta prenda al asistente' }).click();
  const input = page.getByRole('textbox', { name: 'Consulta al asistente' });
  await input.fill('¿Tienen esta prenda en M y azul en Centro?');
  await page.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await expect(page.getByText('BOB 40.00', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.chat-panel').getByText('Algodón', { exact: true })).toBeVisible();
  await input.fill('¿y en negro?');
  const seguir = page.waitForRequest((r) => r.url().endsWith('/asistente/chat'));
  await page.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  expect((await seguir).postDataJSON().contexto).toMatchObject({
    producto_id: f.productoA,
    talla_patrones: ['m'],
  });
  await expect(page.getByRole('button', { name: 'Nueva consulta sin selección' })).toBeEnabled();
  await page.getByRole('button', { name: 'Nueva consulta sin selección' }).click();
  await input.fill('Mis reservas');
  await page.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  const opciones = page.getByRole('button', { name: /Consultar RESERVA #/ });
  await expect(opciones).toHaveCount(2);
  await opciones.first().click();
  await input.fill('¿Cuándo vence esa reserva?');
  const siguiente = page.waitForRequest((r) => r.url().endsWith('/asistente/chat'));
  await page.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  expect((await siguiente).postDataJSON().contexto).toMatchObject({ recurso_tipo: 'RESERVA' });
  await expect(page.getByRole('button', { name: 'Enviar consulta', exact: true })).toBeDisabled();
  await expect(page.getByText('Vencimiento', { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  const ajeno = await request.post(API + '/asistente/chat', {
    headers,
    data: { mensaje: '¿Tienen esta prenda?', contexto: { producto_id: f.productoB } },
  });
  expect([403, 404]).toContain(ajeno.status());
  const cuentaB = await request.post(API + '/autenticacion/login', {
    data: { identificador: f.clienteB, password: 'Prueba-aislada-123', empresa_codigo: f.b.codigo },
  });
  const b = {
    Authorization: 'Bearer ' + (await cuentaB.json()).access_token,
    'X-Empresa-Codigo': f.b.codigo,
  };
  const privado = await request.post(API + '/asistente/chat', {
    headers: b,
    data: { mensaje: 'Mis reservas' },
  });
  expect((await privado.json()).datos).toEqual([]);
});
