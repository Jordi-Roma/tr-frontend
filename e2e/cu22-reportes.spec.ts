import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const f = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  a: { codigo: string };
  encargado: string;
  sucursalA: number;
  sucursalB: number;
};
const API = 'http://127.0.0.1:58127/api/v1';
async function login(page: Page, encargado = false) {
  await page.route('**/*', (r) => {
    const u = new URL(r.request().url());
    return u.hostname === '127.0.0.1' && u.port === '8000'
      ? r.continue({ url: r.request().url().replace(':8000', ':58127') })
      : ['127.0.0.1', 'localhost'].includes(u.hostname)
        ? r.continue()
        : r.abort();
  });
  await page.goto('/e/' + f.a.codigo);
  await page.getByRole('link', { name: 'Ingresar', exact: true }).click();
  await page.getByLabel('Usuario o correo').fill(encargado ? f.encargado : f.a.codigo);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
test('CU22: dashboard, 5200 filas, filtros congelados, exportación y programación con conflicto', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  await login(page);
  const t = await request.post(API + '/autenticacion/login', {
    data: { identificador: f.a.codigo, password: 'Prueba-aislada-123', empresa_codigo: f.a.codigo },
  });
  const headers = {
    Authorization: 'Bearer ' + (await t.json()).access_token,
    'X-Empresa-Codigo': f.a.codigo,
  };
  for (const p of await (await request.get(API + '/reportes/programados', { headers })).json())
    expect(
      (await request.delete(API + `/reportes/programados/${p.id}`, { headers })).ok(),
    ).toBeTruthy();
  page.on('dialog', (d) => d.accept());
  await page.goto('/dashboard');
  await expect(page.getByText('10400.00', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Sin porcentaje: base anterior cero').first()).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.goto('/reportes');
  await page.getByRole('button', { name: 'Generar reporte', exact: true }).click();
  await expect(page.getByText('Página 1 de 260')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
  await page.locator('#reporte-tipo').selectOption('PAGOS');
  const siguiente = page.waitForRequest((r) => r.url().endsWith('/reportes/detalle'));
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  expect((await siguiente).postDataJSON()).toMatchObject({ tipo: 'VENTAS', pagina: 2, tamano: 20 });
  await expect(page.getByText('Página 2 de 260')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.locator('#reporte-tipo').selectOption('USUARIOS');
  await page.getByRole('button', { name: 'Generar reporte', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF' }).click();
  expect((await descarga).suggestedFilename()).toMatch(/usuarios.*\.pdf$/);
  await page.locator('#prog-titulo').fill('Informe de usuarios');
  await page.locator('#prog-tipo').selectOption('USUARIOS');
  await page.locator('#prog-correo').fill('reporte@example.invalid');
  await page.getByLabel('Programación activa', { exact: true }).uncheck();
  const creacion = page.waitForResponse(
    (r) => r.url().endsWith('/reportes/programados') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Guardar programación', exact: true }).click();
  const creada = await creacion;
  expect(creada.ok()).toBeTruthy();
  const p = await creada.json();
  await page.getByRole('button', { name: 'Editar Informe de usuarios', exact: true }).click();
  await page.locator('#prog-titulo').fill('Informe editado');
  expect(
    (
      await request.patch(API + `/reportes/programados/${p.id}/estado`, {
        headers,
        data: { activo: false },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Guardar programación', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Revisar versión vigente' })).toBeVisible();
  await expect(page.locator('#prog-titulo')).toHaveValue('Informe editado');
  await page.getByRole('button', { name: 'Revisar versión vigente' }).click();
  await page.getByRole('button', { name: 'Guardar programación', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Editar Informe editado', exact: true }),
  ).toBeVisible();
  const lista = await (await request.get(API + '/reportes/programados', { headers })).json();
  expect(lista.find((x: { id: number }) => x.id === p.id).activo).toBe(false);
  await expect(
    page.getByRole('button', { name: 'Ejecutar Informe editado', exact: true }),
  ).toBeDisabled();
  const activacion = page.waitForResponse((r) => r.url().endsWith(`/programados/${p.id}/estado`));
  await page.getByRole('button', { name: 'Activar Informe editado', exact: true }).click();
  expect((await activacion).ok()).toBeTruthy();
  await page.getByRole('button', { name: 'Ejecutar Informe editado', exact: true }).click();
  await expect(page.getByText('ENVIADO ·', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test('CU22: encargado limitado a su sucursal, sin usuarios ni programaciones', async ({
  page,
  request,
}) => {
  await login(page, true);
  await page.goto('/reportes');
  await expect(page.locator('#reporte-sucursal option')).toHaveCount(1);
  await expect(page.locator('#reporte-tipo option[value="USUARIOS"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Programación de reportes' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Generar reporte', exact: true }).click();
  await expect(page.getByText('Página 1 de 260')).toBeVisible();
  const r = await request.post(API + '/autenticacion/login', {
    data: {
      identificador: f.encargado,
      password: 'Prueba-aislada-123',
      empresa_codigo: f.a.codigo,
    },
  });
  const headers = {
    Authorization: 'Bearer ' + (await r.json()).access_token,
    'X-Empresa-Codigo': f.a.codigo,
  };
  expect(
    (
      await request.post(API + '/reportes/detalle', {
        headers,
        data: {
          tipo: 'VENTAS',
          fecha_desde: '2026-11-01',
          fecha_hasta: '2026-11-30',
          sucursal_id: f.sucursalB,
        },
      })
    ).status(),
  ).toBe(403);
});
