import { test, expect, Page, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const f = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {
  as: string;
  plan: number;
  a: { id: number; codigo: string };
  b: { id: number; codigo: string };
  cajero: string;
};
const API = 'http://127.0.0.1:18127/api/v1';
async function transporte(page: Page) {
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' && u.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':18127') });
    return ['localhost', '127.0.0.1'].includes(u.hostname) ? route.continue() : route.abort();
  });
}
async function token(request: APIRequestContext, usuario: string, codigo: string | null) {
  const r = await request.post(API + '/autenticacion/login', {
    data: {
      identificador: usuario,
      password: codigo ? 'Prueba-aislada-123' : 'Prueba-AS-local-123',
      empresa_codigo: codigo,
    },
  });
  expect(r.ok()).toBeTruthy();
  return {
    Authorization: 'Bearer ' + (await r.json()).access_token,
    ...(codigo ? { 'X-Empresa-Codigo': codigo } : {}),
  };
}
async function login(page: Page, saas = false) {
  if (saas) await page.goto('/saas/login');
  else {
    await page.goto('/e/' + f.a.codigo);
    await page.getByRole('link', { name: 'Ingresar', exact: true }).click();
  }
  await page.getByLabel('Usuario o correo').fill(saas ? f.as : f.a.codigo);
  await page
    .getByLabel('Contrasena', { exact: true })
    .fill(saas ? 'Prueba-AS-local-123' : 'Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function accesible(page: Page) {
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}

test('CU25: cuota, programación, aislamiento y restauraciones reales sobre bases de ensayo', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  await transporte(page);
  page.on('dialog', async (d) => d.accept());
  const as = await token(request, f.as, null),
    codigoPersonal = f.a.codigo;
  const sello = Date.now();
  for (const destino of ['a', 'b'] as const) {
    const codigo = 'cu25-' + destino + '-' + sello;
    const alta = await request.post(API + '/saas/empresas', {
      headers: as,
      data: {
        codigo,
        nombre: 'Empresa respaldo ' + destino,
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
    expect(alta.ok()).toBeTruthy();
    const empresa = await alta.json();
    f[destino] = { id: empresa.id, codigo };
  }
  const b = await token(request, f.b.codigo, f.b.codigo);
  const cambios = {
    limites: { respaldos_manuales_semana: 2 },
    funciones: {
      respaldos_manuales: true,
      respaldos_automaticos: true,
      horario_respaldo_configurable: false,
    },
  };
  const p = await (
    await request.post(API + `/saas/planes/${f.plan}/previsualizar`, { headers: as, data: cambios })
  ).json();
  expect(
    (
      await request.put(API + `/saas/planes/${f.plan}`, {
        headers: as,
        data: { ...cambios, token_previsualizacion: p.token_previsualizacion },
      })
    ).ok(),
  ).toBeTruthy();
  await login(page);
  await page.goto('/respaldos');
  await expect(page.getByRole('heading', { name: 'Respaldos de mi empresa' })).toBeVisible();
  await expect(page.getByLabel('Alcance', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Eliminar copias vencidas' })).toHaveCount(0);
  await expect(page.getByText('Horario fijo: 02:00 · America/La_Paz.')).toBeVisible();
  const guardado = page.waitForRequest(
    (r) => r.url().endsWith('/respaldos/programacion') && r.method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Guardar programación', exact: true }).click();
  const datos = (await guardado).postDataJSON();
  expect(datos.hora_local).toBe('02:00');
  expect(datos.zona_horaria).toBe('America/La_Paz');
  await expect(page.getByRole('status').filter({ hasText: 'Programación guardada' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear copia cifrada' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Respaldo creado' })).toBeVisible();
  const segunda = page.waitForResponse(
    (r) => r.url().endsWith('/respaldos') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Crear copia cifrada' }).click();
  expect((await segunda).status()).toBe(201);
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Crear copia cifrada' })).toBeDisabled();
  const a = {
    Authorization:
      'Bearer ' + (await page.evaluate(() => localStorage.getItem('backend_tr_token'))),
    'X-Empresa-Codigo': f.a.codigo,
  };
  const copias = await (await request.get(API + '/respaldos', { headers: a })).json();
  expect(copias).toHaveLength(2);
  const copia = copias[0].id,
    eliminar = copias[1].id;
  const copiaB = await (await request.post(API + '/respaldos', { headers: b, data: {} })).json();
  expect(
    (
      await request.post(API + `/respaldos/${copiaB.id}/previsualizar`, { headers: a, data: {} })
    ).status(),
  ).toBe(404);
  expect((await request.post(API + '/respaldos', { headers: a, data: {} })).status()).toBe(429);
  await page.getByRole('button', { name: 'Eliminar respaldo ' + eliminar, exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copia eliminada' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear copia cifrada' })).toBeDisabled();
  expect(
    (await (await request.get(API + '/mi-empresa/capacidades', { headers: a })).json()).uso
      .respaldos_manuales_semana,
  ).toBe(2);
  // Cambiar suscripción conserva el plan actual al restaurar la copia anterior.
  const planes = await (await request.get(API + '/saas/planes', { headers: as })).json();
  const basico = planes.find((p: { codigo: string }) => p.codigo === 'BASICO');
  expect(
    (
      await request.post(API + `/saas/empresas/${f.a.id}/suscripcion`, {
        headers: as,
        data: { plan_id: basico.id, fecha_inicio: '2020-01-01', fecha_vencimiento: null },
      })
    ).ok(),
  ).toBeTruthy();
  const antes = await (await request.get(API + '/perfil', { headers: a })).json();
  expect(
    (
      await request.put(API + '/perfil', {
        headers: a,
        data: { nombre: 'Nombre posterior a la copia', apellido: antes.apellido },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Previsualizar respaldo ' + copia, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisar restauración' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Restaurar copia revisada' })).toBeDisabled();
  await expect(page.getByText(/todavía no está suspendida/)).toBeVisible();
  expect(
    (
      await request.patch(API + `/saas/empresas/${f.a.id}/estado`, {
        headers: as,
        data: { estado: 'SUSPENDIDA' },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Previsualizar respaldo ' + copia, exact: true }).click();
  const frase = 'RESTAURAR ' + copia;
  await page.getByLabel('Confirmación explícita').fill('Frase incorrecta');
  await expect(page.getByRole('button', { name: 'Restaurar copia revisada' })).toBeDisabled();
  let restauraciones = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST' && /\/respaldos\/[^/]+\/restaurar$/.test(r.url())) restauraciones++;
  });
  await page.getByLabel('Confirmación explícita').fill(frase);
  await page.getByLabel('Confirmación explícita').press('Enter');
  expect(restauraciones).toBe(0);
  await accesible(page);
  await page.getByRole('button', { name: 'Restaurar copia revisada' }).click();
  await expect(page).toHaveURL(/\/login\?motivo=empresa_restaurada/);
  await expect(page.getByText(/Empresa restaurada. Se cerraron sus sesiones/)).toBeVisible();
  expect((await request.get(API + '/perfil', { headers: a })).status()).toBe(401);
  const nuevo = await token(request, f.a.codigo, f.a.codigo);
  expect((await (await request.get(API + '/perfil', { headers: nuevo })).json()).nombre).toBe(
    antes.nombre,
  );
  expect(
    (await (await request.get(API + '/mi-empresa/capacidades', { headers: nuevo })).json()).plan.id,
  ).toBe(basico.id);
  expect((await request.get(API + '/perfil', { headers: b })).ok()).toBeTruthy();
  expect(
    (await (await request.get(API + '/respaldos', { headers: nuevo })).json()).some(
      (r: { origen: string }) => r.origen === 'PRE_RESTAURACION',
    ),
  ).toBeTruthy();
  // SaaS conserva su sesión tras restaurar globalmente en una base vacía separada.
  await login(page, true);
  await page.goto('/saas/respaldos');
  await expect(page.getByRole('heading', { name: 'Respaldos de plataforma' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear copia cifrada' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Respaldo creado' })).toBeVisible();
  const global = (await (await request.get(API + '/saas/respaldos', { headers: as })).json()).find(
    (r: { tipo: string }) => r.tipo === 'GLOBAL',
  );
  await page
    .getByRole('button', { name: 'Previsualizar respaldo ' + global.id, exact: true })
    .click();
  await expect(page.getByText(/No reemplaza la base activa/)).toBeVisible();
  await page.getByLabel('Confirmación explícita').fill('RESTAURAR ' + global.id);
  await page.getByRole('button', { name: 'Restaurar copia revisada' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Copia restaurada en el entorno de ensayo' }),
  ).toBeVisible();
  expect((await request.get(API + '/saas/empresas', { headers: as })).ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await accesible(page);
  await page.getByRole('button', { name: 'Eliminar copias vencidas' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Copias vencidas procesadas' }),
  ).toBeVisible();
  const cajero = await token(request, f.cajero, codigoPersonal);
  expect((await request.get(API + '/respaldos', { headers: cajero })).status()).toBe(403);
});
