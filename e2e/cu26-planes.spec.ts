import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const f = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  as: string;
  plan: number;
  a: { id: number; codigo: string; nombre: string };
};
const API = 'http://127.0.0.1:18127/api/v1';
async function transporte(page: Page) {
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' && u.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':18127') });
    if (['localhost', '127.0.0.1'].includes(u.hostname)) return route.continue();
    return route.abort();
  });
}
async function login(page: Page, saas = true) {
  if (!saas) {
    await page.goto('/e/' + f.a.codigo);
    await expect(page).toHaveURL(/\/inicio$/);
    await page.getByRole('link', {name:'Ingresar', exact:true}).click();
    await expect(page.getByRole('heading', {name:'Iniciar sesión', exact:true})).toBeVisible();
  } else { await page.goto('/saas/login'); }
  await page.getByLabel('Usuario o correo').fill(saas ? f.as : f.a.codigo);
  await page.getByLabel('Contrasena', {exact:true}).fill(saas ? 'Prueba-AS-local-123' : 'Prueba-aislada-123');
  await page.getByRole('button', {name:'Ingresar', exact:true}).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function headers(page: Page) {
  return {
    Authorization:
      'Bearer ' + (await page.evaluate(() => localStorage.getItem('backend_tr_token'))),
  };
}
async function accesible(page: Page) {
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
test.beforeEach(async ({ page }) => {
  await transporte(page);
  await login(page);
});

test('plan: creación, impacto, conflicto, conservación de claves e historial', async ({ page }) => {
  await page.goto('/saas/planes');
  await page.getByRole('button', { name: 'Nuevo plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Crear plan', exact: true })).toBeVisible();
  const codigo = 'UI_' + Date.now(),
    nombre = 'Plan UI ' + codigo;
  await page.getByLabel('Código', { exact: true }).fill(codigo);
  await page.getByLabel('Nombre', { exact: true }).fill(nombre);
  await page.getByLabel('Precio de referencia', { exact: true }).fill('25.50');
  await page.getByLabel('ID del precio mensual en Stripe', { exact: true }).fill('price_E2E25');
  await page.getByLabel('Descripción', { exact: true }).fill('Configuración inicial');
  await page.getByRole('button', { name: 'Crear plan', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Plan guardado' })).toBeVisible();
  const h = await headers(page);
  let planes = await (await page.request.get(API + '/saas/planes', { headers: h })).json();
  const id = planes.find((p: { codigo: string }) => p.codigo === codigo).id;
  let prev = await (
    await page.request.post(API + `/saas/planes/${id}/previsualizar`, {
      headers: h,
      data: { limites: { productos: 777 } },
    })
  ).json();
  expect(
    (
      await page.request.put(API + `/saas/planes/${id}`, {
        headers: h,
        data: { limites: { productos: 777 }, token_previsualizacion: prev.token_previsualizacion },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  const tarjeta = page.getByRole('article', { name: nombre, exact: true });
  await expect(tarjeta.getByRole('link', { name: 'Ver empresas de ' + nombre })).toHaveAttribute(
    'href', '/saas/empresas?plan_id=' + id,
  );
  const editar = tarjeta.getByRole('button', { name: 'Editar plan ' + nombre, exact: true });
  await editar.click();
  const editor = page.getByRole('dialog', { name: 'Editar ' + nombre });
  await expect(editor).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await expect(editar).toBeFocused();
  await editar.click();
  await page.getByLabel('Descripción', { exact: true }).fill('Edición confirmada');
  await page.getByRole('button', { name: 'Revisar impacto', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Revisar impacto antes de guardar' }),
  ).toBeFocused();
  await accesible(page);
  // Un cambio simultáneo debe invalidar el token ya mostrado.
  const cambios = { condiciones: 'Actualización simultánea' };
  prev = await (
    await page.request.post(API + `/saas/planes/${id}/previsualizar`, { headers: h, data: cambios })
  ).json();
  expect(
    (
      await page.request.put(API + `/saas/planes/${id}`, {
        headers: h,
        data: { ...cambios, token_previsualizacion: prev.token_previsualizacion },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Guardar cambios del plan' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Vuelve a revisar el impacto' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios del plan' })).toHaveCount(0);
  await expect(page.getByLabel('Descripción', { exact: true })).toHaveValue('Edición confirmada');
  await page.getByRole('button', { name: 'Revisar impacto', exact: true }).click();
  await page.getByRole('button', { name: 'Volver a editar' }).click();
  await page.getByLabel('Precio de referencia', { exact: true }).fill('30');
  await page.getByLabel('ID del precio mensual en Stripe', { exact: true }).fill('price_E2E30');
  await expect(page.getByRole('button', { name: 'Guardar cambios del plan' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Revisar impacto', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar cambios del plan' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Plan guardado' })).toBeVisible();
  planes = await (await page.request.get(API + '/saas/planes', { headers: h })).json();
  const guardado = planes.find((p: { id: number }) => p.id === id);
  expect(guardado.limites.productos).toBe(777);
  expect(Number(guardado.precio)).toBe(30);
  expect(guardado.stripe_price_id).toBe('price_E2E30');
  expect(guardado.descripcion).toBe('Edición confirmada');
  expect(guardado.condiciones).toBe('Actualización simultánea');
  await page.getByRole('button', { name: 'Historial de ' + nombre }).click();
  await expect(page.getByRole('heading', { name: 'Historial de ' + nombre })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await accesible(page);
  await editar.click();
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Cancelar', exact: true })).toBeInViewport();
  await accesible(page);
  await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(editar).toBeFocused();
});

test('empresas: filtro por plan, paginación, política, historial y renovación', async ({
  page,
}) => {
  test.setTimeout(120000);
  const h = await headers(page);
  const suf = Date.now();
  for (let i = 0; i < 21; i++) {
    const codigo = `ui-${suf}-${i}`;
    const r = await page.request.post(API + '/saas/empresas', {
      headers: h,
      data: {
        codigo,
        nombre: 'Empresa UI ' + suf + ' ' + i,
        plan_id: f.plan,
        fecha_inicio: '2020-01-01',
        fecha_vencimiento: null,
        administrador: {
          nombre: 'Admin',
          apellido: 'Prueba',
          username: codigo,
          correo: codigo + '@example.invalid',
          password: 'Prueba-aislada-123',
        },
      },
    });
    expect(r.ok()).toBeTruthy();
  }
  await page.goto('/saas/empresas?plan_id=' + f.plan);
  await page.getByLabel('Nombre o código').fill('Empresa UI ' + suf);
  await page.getByRole('button', { name: 'Buscar empresas', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '21 empresas' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Configurar Empresa UI ' + suf + ' 20', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Historial de suscripciones' })).toBeVisible();
  await expect(page.locator('app-capacidades-plan')).toContainText('Uso y cupos del plan');
  await page.getByRole('button', { name: 'Guardar suscripción', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Suscripción actualizada' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Configurar Empresa UI ' + suf + ' 20', exact: true })
    .click();
  await expect(
    page
      .getByRole('heading', { name: 'Historial de suscripciones' })
      .locator('..')
      .locator('li')
      .filter({ hasText: 'Prueba' }),
  ).toHaveCount(2);
  await accesible(page);
});

test('sesión de empresa abierta actualiza capacidades tras cambio de plan SaaS', async ({
  page,
  browser,
}) => {
  const h = await headers(page);
  const habilitar = { funciones: { reportes_pdf: true } };
  const previa = await (
    await page.request.post(API + `/saas/planes/${f.plan}/previsualizar`, {
      headers: h,
      data: habilitar,
    })
  ).json();
  expect(
    (
      await page.request.put(API + `/saas/planes/${f.plan}`, {
        headers: h,
        data: { ...habilitar, token_previsualizacion: previa.token_previsualizacion },
      })
    ).ok(),
  ).toBeTruthy();
  const ctx = await browser.newContext();
  const empresa = await ctx.newPage();
  await transporte(empresa);
  await login(empresa, false);
  try {
    await empresa.goto('/mi-plan');
    await expect(empresa.locator('app-capacidades-plan')).toContainText('Exportar PDF: Habilitada');
    const cambios = { funciones: { reportes_pdf: false, reportes_excel: true } };
    const prev = await (
      await page.request.post(API + `/saas/planes/${f.plan}/previsualizar`, {
        headers: h,
        data: cambios,
      })
    ).json();
    expect(
      (
        await page.request.put(API + `/saas/planes/${f.plan}`, {
          headers: h,
          data: { ...cambios, token_previsualizacion: prev.token_previsualizacion },
        })
      ).ok(),
    ).toBeTruthy();
    await empresa.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(empresa.locator('app-capacidades-plan')).toContainText(
      'Exportar PDF: No incluido en el plan',
    );
    await accesible(empresa);
  } finally {
    await ctx.close();
  }
});
