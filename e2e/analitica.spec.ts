import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync } from 'node:fs';

// Ensayo optativo, solo contra localhost y cuentas locales ya autorizadas.
const habilitado = process.env['STYLEAR_ANALITICA_E2E_LOCAL'] === '1';
const credenciales = '../tr-backend/.private/cuentas_prueba_roles_20261101.json';
test.skip(
  !habilitado || !existsSync(credenciales),
  'Requiere API local y cuentas privadas de ensayo.',
);
const api = 'http://127.0.0.1:8000/api/v1';
test.use({ actionTimeout: 15000 });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (r) => {
    const u = new URL(r.request().url());
    return ['127.0.0.1', 'localhost'].includes(u.hostname) ? r.continue() : r.abort();
  });
});

async function entrar(page: Page, rol: string): Promise<string> {
  const cuentas = JSON.parse(readFileSync(credenciales, 'utf8')) as {
    rol: string;
    usuario: string;
    password: string;
  }[];
  const cuenta = cuentas.find((c) => c.rol === rol)!;
  await page.goto('/e/stylear');
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(cuenta.usuario);
  await page.getByLabel('Contrasena', { exact: true }).fill(cuenta.password);
  const respuesta = page.waitForResponse(
    (r) => r.url().endsWith('/autenticacion/login') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const r = await respuesta;
  expect(r.ok()).toBeTruthy();
  const token = ((await r.json()) as { access_token: string }).access_token;
  await expect(page).not.toHaveURL(/\/login$/);
  return token;
}

test('administrador distingue oficial y demostración, filtra y consulta grupos sin barreras AXE', async ({
  page,
}) => {
  test.setTimeout(120000);
  const token = await entrar(page, 'ADMINISTRADOR');
  try {
    await page.goto('/analitica');
    await expect(page.getByText('Historial insuficiente', { exact: true })).toBeVisible();
    await expect(page.locator('app-serie-analitica svg')).toHaveCount(0);
    await page
      .getByRole('combobox', { name: 'Origen de datos', exact: true })
      .selectOption('DEMOSTRACION');
    await expect(
      page.getByRole('heading', { name: 'Evaluación histórica de predicciones', exact: true }),
    ).toBeVisible();
    await expect(page.locator('app-serie-analitica svg')).toHaveCount(2);
    await page
      .getByRole('combobox', { name: 'Sucursal', exact: true })
      .selectOption({ label: 'Suc Banzer' });
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(page.getByText('Página 1 · 108 registros', { exact: true })).toBeVisible();
    const descargaPdf = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
    const pdf = await descargaPdf;
    expect(pdf.suggestedFilename()).toContain('demostracion.pdf');
    await pdf.saveAs(
      '../tr-backend/.private/analitica/exportaciones_qa/e2e_predicciones_banzer.pdf',
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .locator('app-serie-analitica')
      .screenshot({ path: '../tr-backend/.private/analitica_grafico_web.png' });
    await page
      .getByRole('heading', { name: 'Evaluación histórica de predicciones', exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '../tr-backend/.private/analitica_predicciones_web.png',
      fullPage: true,
    });
    await page
      .getByRole('textbox', { name: 'Solicitud de analítica', exact: true })
      .fill('Muéstrame los grupos de clientes con datos sintéticos en Excel');
    await page.getByRole('button', { name: 'Revisar solicitud', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Vista previa de la solicitud', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Aplicar solicitud revisada', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Grupos de clientes', exact: true }),
    ).toBeVisible();
    const descargaExcel = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar Excel', exact: true }).click();
    const excel = await descargaExcel;
    expect(excel.suggestedFilename()).toContain('demostracion.xlsx');
    await excel.saveAs('../tr-backend/.private/analitica/exportaciones_qa/e2e_segmentos.xlsx');
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await page
      .getByRole('heading', { name: 'Grupos de clientes', exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '../tr-backend/.private/analitica_segmentos_web_mobile.png',
      fullPage: true,
    });
  } finally {
    await fetch(api + '/autenticacion/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(5000),
    });
  }
});

test('encargado conserva su alcance y no recibe la opción de segmentos', async ({ page }) => {
  test.setTimeout(90000);
  const token = await entrar(page, 'ENCARGADO_SUCURSAL');
  try {
    await page.goto('/analitica');
    await expect(page.getByText('Historial insuficiente', { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole('combobox', { name: 'Análisis', exact: true })
        .locator('option[value="segmentos"]'),
    ).toHaveCount(0);
    await page
      .getByRole('combobox', { name: 'Origen de datos', exact: true })
      .selectOption('DEMOSTRACION');
    await expect(page.getByText('Página 1 · 108 registros', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Sucursal', exact: true }).locator('option'),
    ).toHaveCount(2);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await fetch(api + '/autenticacion/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(5000),
    });
  }
});
