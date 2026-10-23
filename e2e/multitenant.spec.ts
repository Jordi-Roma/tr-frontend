import { test, expect, Page, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

interface Fixture {
  a: { id: number; codigo: string; nombre: string };
  b: { id: number; codigo: string; nombre: string };
  clienteA: string;
  clienteB: string;
  cajero: string;
  encargado: string;
  proveedor: string;
  as: string;
  productoA: number;
  productoB: number;
  varianteA: number;
  sucursalA: number;
  plan: number;
}
const datos: Fixture = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8'));
const API = 'http://127.0.0.1:58127/api/v1';

test.beforeEach(async ({ page }) => {
  // Transport only: payloads are handled by the real temporary FastAPI/PostgreSQL fixture.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === '8000')
      return route.continue({ url: route.request().url().replace(':8000', ':58127') });
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

async function entrar(page: Page, codigo: string, usuario: string) {
  await page.goto(`/e/${codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function plataforma(page: Page) {
  await page.goto('/saas/login');
  await page.getByLabel('Usuario o correo').fill(datos.as);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-AS-local-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/saas\/empresas$/);
}
async function tokenAS(request: APIRequestContext) {
  const r = await request.post(`${API}/autenticacion/login`, {
    data: { identificador: datos.as, password: 'Prueba-AS-local-123', empresa_codigo: null },
  });
  expect(r.ok()).toBeTruthy();
  return (await r.json()).access_token as string;
}
async function accesible(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const resultado = await new AxeBuilder({ page }).analyze();
  await page.screenshot({
    path:
      'test-results/qa-' +
      new URL(page.url()).pathname.replace(/[^a-z0-9]+/gi, '-') +
      '-' +
      page.viewportSize()?.width +
      '.png',
    fullPage: true,
  });
  expect(
    resultado.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}

test('directorio accesible, búsqueda por nombre y catálogos A/B separados', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Elige una empresa/ })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: datos.a.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Código de empresa')).toHaveCount(0);
  await accesible(page);
  await page
    .getByRole('searchbox', { name: 'Buscar empresa por nombre' })
    .fill('no hay una tienda así');
  await expect(page.getByRole('heading', { name: 'No encontramos esa empresa' })).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Buscar empresa por nombre' })
    .fill(datos.a.nombre.toUpperCase());
  await expect(
    page.getByRole('button', {
      name: datos.b.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole('button', {
      name: datos.a.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole('link', { name: 'Ir al inicio de ' + datos.a.nombre })).toBeVisible();
  await page.goto('/catalogo');
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toBeVisible();
  await expect(page.getByText('Prenda Empresa B', { exact: true })).toHaveCount(0);
  await page.goto('/empresa');
  await page
    .getByRole('button', {
      name: datos.b.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/catalogo');
  await expect(page.getByText('Prenda Empresa B', { exact: true })).toBeVisible();
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toHaveCount(0);
  await page.goto('/e/no-existe-e2e');
  await expect(page.getByRole('alert')).toContainText('Empresa no encontrada');
  await expect(page).toHaveURL(/no-existe-e2e$/);
  expect(await page.evaluate(() => localStorage.getItem('stylear_empresa_codigo_v1'))).toBeNull();
});

test('login comercial, registro y recuperación muestran la empresa; credenciales cruzadas rechazadas', async ({
  page,
}) => {
  await page.goto(`/e/${datos.b.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await accesible(page);
  await page.getByLabel('Usuario o correo').fill(datos.clienteA);
  await page.getByLabel('Contrasena', { exact: true }).fill('Prueba-aislada-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Credenciales incorrectas');
  expect(await page.evaluate(() => localStorage.getItem('backend_tr_token'))).toBeNull();
  await page.goto('/registro');
  await expect(page.getByRole('link', { name: 'Cambiar empresa' })).toBeVisible();
  await page.goto('/recuperar-password');
  await expect(page.getByRole('link', { name: 'Cambiar empresa' })).toBeVisible();
});

test('cambiar A por B requiere cerrar sesión y limpia carrito y sucursal', async ({
  page,
  request,
}) => {
  await entrar(page, datos.a.codigo, datos.clienteA);
  const token = await page.evaluate(() => localStorage.getItem('backend_tr_token'));
  await request.delete(`${API}/carrito`, { headers: { Authorization: `Bearer ${token}` } });
  const add = await request.post(`${API}/carrito/items`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { producto_variante_id: datos.varianteA, sucursal_id: datos.sucursalA, cantidad: 1 },
  });
  expect(add.ok()).toBeTruthy();
  await page.goto('/carrito');
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toBeVisible();
  await page.goto(`/e/${datos.b.codigo}`);
  await expect(page.getByRole('heading', { name: /Entrar a/ }).last()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión y entrar' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('backend_tr_token'))).toBe(token);
  await page.getByRole('button', { name: 'Cerrar sesión y entrar' }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  expect(await page.evaluate(() => localStorage.getItem('backend_tr_token'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('stylear_cart_branch'))).toBeNull();
  await page.goto('/catalogo');
  await expect(page.getByText('Prenda Empresa B', { exact: true })).toBeVisible();
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toHaveCount(0);
});

test('AD administra su empresa y no puede abrir plataforma o IDs ajenos', async ({
  page,
  request,
}) => {
  await entrar(page, datos.a.codigo, datos.a.codigo);
  await page.goto('/categorias');
  await expect(page.getByRole('button', { name: /Nueva categor/ })).toBeVisible();
  await page.goto('/saas/empresas');
  await expect(page).toHaveURL(/\/403$/);
  const token = await page.evaluate(() => localStorage.getItem('backend_tr_token'));
  const r = await request.get(`${API}/catalogo/prendas/${datos.productoB}`, {
    headers: { 'X-Empresa-Codigo': datos.a.codigo, Authorization: `Bearer ${token}` },
  });
  expect(r.status()).toBe(404);
  await page.goto('/roles');
  await expect(page.getByRole('button', { name: 'Nuevo rol', exact: true })).toHaveCount(0);
});

test('suspensión conserva consultas, plan y pagos pendientes y bloquea nuevas altas', async ({
  page,
  request,
}) => {
  await entrar(page, datos.a.codigo, datos.a.codigo);
  const token = await tokenAS(request);
  const h = { Authorization: `Bearer ${token}` };
  try {
    expect(
      (
        await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
          headers: h,
          data: { estado: 'SUSPENDIDA' },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto('/mi-plan');
    await expect(
      page.getByText('Las operaciones nuevas están restringidas.', { exact: false }),
    ).toBeVisible();
    await accesible(page);
    await page.goto('/usuarios');
    await expect(page.getByRole('button', { name: 'Nuevo usuario', exact: true })).toBeDisabled();
    await page.goto('/pagos');
    await expect(page).toHaveURL(/\/pagos$/);
    expect(await page.evaluate(() => localStorage.getItem('backend_tr_token'))).not.toBeNull();
  } finally {
    await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
      headers: h,
      data: { estado: 'ACTIVA' },
    });
  }
});

for (const [rol, ruta] of [
  ['cajero', 'venta-presencial'],
  ['encargado', 'inventario'],
  ['proveedor', 'panel-proveedor'],
] as const) {
  test(`navegación y alcance de ${rol}`, async ({ page }) => {
    await entrar(page, datos.a.codigo, datos[rol]);
    await expect(page).toHaveURL(new RegExp('/' + ruta + '$'));
    await expect(page.getByRole('link', { name: 'Empresas', exact: true })).toHaveCount(0);
    await page.goto('/saas/planes');
    await expect(page).toHaveURL(/\/403$/);
  });
}

test('AS tiene pantallas accesibles y crea/edita planes sin entrar al negocio', async ({
  page,
}) => {
  await plataforma(page);
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Catalogo', exact: true })).toHaveCount(0);
  await accesible(page);
  await page.goto('/saas/planes');
  await expect(page.getByRole('heading', { name: 'Planes', exact: true })).toBeVisible();
  await accesible(page);
  const codigo = 'E2E_' + Date.now();
  await page.getByLabel(/^Código/).fill(codigo);
  await page.getByLabel('Nombre', { exact: true }).fill('Plan navegador');
  await page.getByLabel('Cuentas', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Guardar plan', exact: true }).click();
  await expect(page.getByText('Plan guardado.', { exact: true })).toBeVisible();
  await expect(page.getByText(codigo, { exact: true })).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: codigo })
    .getByRole('button', { name: /Editar plan/ })
    .click();
  await page.getByLabel('Nombre', { exact: true }).fill('Plan navegador editado');
  page.once('dialog', (dialog) => dialog.accept());
  const guardado = page.waitForResponse(
    (r) => r.url().includes('/saas/planes/') && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Guardar plan', exact: true }).click();
  expect((await guardado).ok()).toBeTruthy();
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: codigo })
      .getByText('Plan navegador editado', { exact: true }),
  ).toBeVisible();
  await page.goto('/saas/empresas');
  const codigoEmpresa = 'e2e-' + Date.now();
  await page.locator('#alta-codigo').fill(codigoEmpresa);
  await page.locator('#alta-nombre').fill('Empresa navegador');
  await page.locator('#alta-plan').selectOption({ label: 'Plan navegador editado' });
  await page.locator('#ad-nombre').fill('Admin');
  await page.locator('#ad-apellido').fill('Navegador');
  await page.locator('#ad-usuario').fill(codigoEmpresa);
  await page.locator('#ad-correo').fill(codigoEmpresa + '@example.invalid');
  await page.locator('#ad-password').fill('Nueva-e2e-123!');
  await page.getByRole('button', { name: 'Crear empresa', exact: true }).click();
  await expect(page.getByText('Empresa y administrador creados.', { exact: true })).toBeVisible();
  await expect(page.locator('#ad-password')).toHaveValue('');
  await page.goto('/saas/eventos');
  await expect(page.getByRole('heading', { name: 'Eventos de plataforma' })).toBeVisible();
  await accesible(page);
  await page.goto('/catalogo');
  await expect(page).toHaveURL(/\/saas\/empresas$/);
});

test('AS crea y restaura una copia de A sin cambiar el catálogo de B', async ({
  page,
  request,
}) => {
  await plataforma(page);
  await page.goto('/saas/respaldos');
  await expect(page.getByRole('heading', { name: 'Respaldos', exact: true })).toBeVisible();
  await accesible(page);
  const antes = await (
    await request.get(`${API}/catalogo/prendas`, {
      headers: { 'X-Empresa-Codigo': datos.b.codigo },
    })
  ).json();
  await page
    .getByRole('combobox', { name: 'Alcance', exact: true })
    .selectOption({ label: `${datos.a.nombre} (${datos.a.codigo})` });
  await page.getByRole('button', { name: 'Crear copia cifrada' }).click();
  await expect(page.getByText('Respaldo creado.', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: /Previsualizar respaldo/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Revisar restauración' })).toBeVisible();
  await accesible(page);
  const p = await page.locator('#frase-confirmacion strong').innerText();
  await expect(page.getByRole('button', { name: 'Restaurar copia revisada' })).toBeDisabled();
  const token = await tokenAS(request);
  const h = { Authorization: `Bearer ${token}` };
  await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
    headers: h,
    data: { estado: 'SUSPENDIDA' },
  });
  try {
    await page.getByLabel('Confirmación explícita').fill(p);
    await page.getByRole('button', { name: 'Restaurar copia revisada' }).click();
    await expect(
      page.getByText('Empresa restaurada; permanece suspendida para su revisión.', { exact: true }),
    ).toBeVisible();
    expect(
      await (
        await request.get(`${API}/catalogo/prendas`, {
          headers: { 'X-Empresa-Codigo': datos.b.codigo },
        })
      ).json(),
    ).toEqual(antes);
  } finally {
    await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
      headers: h,
      data: { estado: 'ACTIVA' },
    });
  }
});

test('vencimiento conserva la sesión y muestra el límite en Mi plan', async ({ page, request }) => {
  await entrar(page, datos.a.codigo, datos.a.codigo);
  const token = await tokenAS(request);
  const h = { Authorization: `Bearer ${token}` };
  try {
    expect(
      (
        await request.post(`${API}/saas/empresas/${datos.a.id}/suscripcion`, {
          headers: h,
          data: {
            plan_id: datos.plan,
            fecha_inicio: '2020-01-01',
            fecha_vencimiento: '2020-01-02',
          },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto('/mi-plan');
    await expect(
      page.getByText('Las operaciones nuevas están restringidas.', { exact: false }),
    ).toBeVisible();
    await page.goto('/usuarios');
    await expect(page.getByRole('button', { name: 'Nuevo usuario', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem('backend_tr_token'))).not.toBeNull();
  } finally {
    await request.post(`${API}/saas/empresas/${datos.a.id}/suscripcion`, {
      headers: h,
      data: { plan_id: datos.plan, fecha_inicio: '2020-01-01', fecha_vencimiento: null },
    });
  }
});

test('QR conserva el modal y la confirmación de pago anteriores', async ({ page, request }) => {
  await entrar(page, datos.a.codigo, datos.clienteA);
  const token = await page.evaluate(() => localStorage.getItem('backend_tr_token'));
  const h = { Authorization: `Bearer ${token}` };
  await request.delete(`${API}/carrito`, { headers: h });
  expect(
    (
      await request.post(`${API}/carrito/items`, {
        headers: h,
        data: { producto_variante_id: datos.varianteA, sucursal_id: datos.sucursalA, cantidad: 1 },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto('/carrito');
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pagar con QR Simple y retirar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ya realicé el pago' })).toBeVisible();
  const as = { Authorization: `Bearer ${await tokenAS(request)}` };
  try {
    expect(
      (
        await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
          headers: as,
          data: { estado: 'SUSPENDIDA' },
        })
      ).ok(),
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Ya realicé el pago' }).click();
    await expect(page).toHaveURL(/\/mis-pagos\/\d+$/);
  } finally {
    await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
      headers: as,
      data: { estado: 'ACTIVA' },
    });
  }
});

test('una respuesta lenta de A no repuebla el catálogo al entrar a B', async ({ page }) => {
  await page.goto(`/e/${datos.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  let liberar!: () => void;
  const espera = new Promise<void>((resolve) => (liberar = resolve));
  let recibida!: () => void;
  const recibio = new Promise<void>((resolve) => (recibida = resolve));
  await page.route('**/api/v1/catalogo/prendas**', async (route) => {
    if (route.request().headers()['x-empresa-codigo'] !== datos.a.codigo) return route.fallback();
    const response = await route.fetch({ url: route.request().url().replace(':8000', ':58127') });
    recibida();
    await espera;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.goto('/catalogo');
  await recibio;
  await page.getByRole('link', { name: 'Cambiar empresa', exact: true }).click();
  await page
    .getByRole('button', {
      name: datos.b.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/inicio$/);
  liberar();
  await page.goto('/catalogo');
  await expect(page.getByText('Prenda Empresa B', { exact: true })).toBeVisible();
  await expect(page.getByText('Prenda Empresa A', { exact: true })).toHaveCount(0);
});

test('un cupo consumido por otra alta se informa sin duplicar y Mi plan actualiza el uso', async ({
  page,
  request,
}) => {
  await entrar(page, datos.a.codigo, datos.a.codigo);
  const token = await page.evaluate(() => localStorage.getItem('backend_tr_token'));
  const h = { Authorization: `Bearer ${token}` };
  const antes = await (await request.get(`${API}/mi-empresa/plan`, { headers: h })).json();
  const as = { Authorization: `Bearer ${await tokenAS(request)}` };
  const planes = await (await request.get(`${API}/saas/planes`, { headers: as })).json();
  const original = planes.find((p: { id: number }) => p.id === datos.plan);
  expect(
    (
      await request.put(`${API}/saas/planes/${datos.plan}`, {
        headers: as,
        data: { ...original, limites: { ...original.limites, usuarios: antes.uso.usuarios + 1 } },
      })
    ).ok(),
  ).toBeTruthy();
  try {
    await page.goto('/usuarios');
    await page.getByRole('button', { name: 'Nuevo usuario', exact: true }).click();
    const nombre = 'ui_' + Date.now();
    await page.locator('#crearNombre').fill('Cupo');
    await page.locator('#crearApellido').fill('Prueba');
    await page.locator('#crearUsername').fill(nombre);
    await page.locator('#crearCorreo').fill(nombre + '@example.invalid');
    await page.locator('#crearPassword').fill('Nueva-e2e-123!');
    await page.locator('#crearRol').selectOption({ label: 'CLIENTE' });
    const rol = await page.locator('#crearRol').inputValue();
    // Another operator consumes the final slot while this form remains open.
    const otro = await request.post(`${API}/usuarios`, {
      headers: h,
      data: {
        nombre: 'Otro',
        apellido: 'Operador',
        username: 'otro_' + Date.now(),
        correo: Date.now() + '@example.invalid',
        password: 'Nueva-e2e-123!',
        rol_id: Number(rol.split(': ').at(-1)),
      },
    });
    expect(otro.status()).toBe(201);
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    await expect(
      page.getByText('Se alcanzó el límite de cuentas activas del plan.', { exact: true }).last(),
    ).toBeVisible();
    const usuarios = await (await request.get(`${API}/usuarios`, { headers: h })).json();
    expect(usuarios.some((u: { username: string }) => u.username === nombre)).toBe(false);
    await page.goto('/mi-plan');
    await expect(
      page
        .getByRole('row')
        .filter({ has: page.getByRole('rowheader', { name: 'Cuentas', exact: true }) }),
    ).toContainText(String(antes.uso.usuarios + 1));
  } finally {
    await request.put(`${API}/saas/planes/${datos.plan}`, { headers: as, data: original });
  }
});

test('selector y plataforma funcionan con teclado en pantalla estrecha', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/empresa');
  const busqueda = page.getByRole('searchbox', { name: 'Buscar empresa por nombre' });
  await expect(
    page.getByRole('button', {
      name: datos.a.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    }),
  ).toBeVisible();
  await busqueda.focus();
  await expect(busqueda).toBeFocused();
  await busqueda.fill(datos.a.nombre);
  await expect(page.getByRole('button')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', {
      name: datos.a.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    }),
  ).toBeFocused();
  await accesible(page);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/inicio$/);
  await plataforma(page);
  await accesible(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('el directorio permite reintentar una carga fallida sin elegir una empresa', async ({
  page,
}) => {
  let intentos = 0;
  await page.route('**/api/v1/empresas/publicas', async (route) => {
    if (++intentos === 1)
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'No se pudo cargar el directorio en este momento.' }),
      });
    return route.fallback();
  });
  await page.goto('/empresa');
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar el directorio');
  expect(await page.evaluate(() => localStorage.getItem('stylear_empresa_codigo_v1'))).toBeNull();
  await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: datos.a.nombre + ' Catálogo y novedades Visitar tienda',
      exact: true,
    }),
  ).toBeVisible();
});

test('una empresa cancelada después de cargar las tarjetas no abre datos anteriores', async ({
  page,
  request,
}) => {
  await page.goto(`/e/${datos.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/empresa');
  const tarjeta = page.getByRole('button', {
    name: datos.a.nombre + ' Catálogo y novedades Visitar tienda',
    exact: true,
  });
  await expect(tarjeta).toBeVisible();
  const h = { Authorization: `Bearer ${await tokenAS(request)}` };
  try {
    expect(
      (
        await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
          headers: h,
          data: { estado: 'CANCELADA' },
        })
      ).ok(),
    ).toBeTruthy();
    await tarjeta.click();
    await expect(page.getByRole('alert')).toContainText('Empresa no encontrada');
    expect(await page.evaluate(() => localStorage.getItem('stylear_empresa_codigo_v1'))).toBeNull();
    const listado = await (await request.get(`${API}/empresas/publicas`)).json();
    expect(listado.some((e: { id: number }) => e.id === datos.a.id)).toBe(false);
    await page
      .getByRole('button', {
        name: datos.b.nombre + ' Catálogo y novedades Visitar tienda',
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/inicio$/);
    await page.goto('/catalogo');
    await expect(page.getByText('Prenda Empresa B', { exact: true })).toBeVisible();
    await expect(page.getByText('Prenda Empresa A', { exact: true })).toHaveCount(0);
  } finally {
    await request.patch(`${API}/saas/empresas/${datos.a.id}/estado`, {
      headers: h,
      data: { estado: 'ACTIVA' },
    });
  }
});
