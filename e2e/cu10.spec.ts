import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const datos = JSON.parse(readFileSync('e2e/.fixture.json', 'utf8')) as {a: {codigo: string}; proveedor: string; productoA: number};
const sello=Date.now();

test.beforeEach(async ({page}) => {
  await page.route('**/*', async route => {
    const u=new URL(route.request().url());
    if (u.hostname==='127.0.0.1' && u.port==='8000') return route.continue({url:route.request().url().replace(':8000',':58127')});
    if (['127.0.0.1','localhost'].includes(u.hostname)) return route.continue();
    return route.abort();
  });
  page.on('dialog', dialog => dialog.accept());
});
async function entrar(page: Page, usuario=datos.a.codigo) {
  await page.goto(`/e/${datos.a.codigo}`);
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto('/login');
  await page.getByLabel('Usuario o correo').fill(usuario);
  await page.getByLabel('Contrasena',{exact:true}).fill('Prueba-aislada-123');
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function axe(page:Page) { expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]); }

test('CU10 producto con imagen, variantes y precios en un registro atómico',async({page})=>{
  await entrar(page); await page.goto('/productos');
  await expect(page.getByRole('heading',{name:'Gestion de productos',exact:true})).toBeVisible();
  await axe(page);
  await page.getByRole('button',{name:'Nuevo producto',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.locator('#nombre').fill('CU10 web '+sello);
  await dialog.locator('#categoria_id').selectOption({label:'Ropa'});
  await dialog.getByLabel('URL de imagen').fill('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0m8AAAAASUVORK5CYII=');
  await dialog.getByRole('button',{name:'Agregar URL',exact:true}).click();
  await dialog.getByRole('button',{name:'Agregar variante inicial'}).click();
  await dialog.locator('#sku-inicial-0').fill('CU10-'+sello);
  await dialog.locator('#talla-inicial-0').selectOption({label:'M'});
  await dialog.locator('#color-inicial-0').selectOption({label:'Azul'});
  await dialog.locator('#precio-inicial-0').fill('120');
  await axe(page);
  await dialog.getByRole('button',{name:'Crear producto',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  const fila=page.getByRole('row').filter({hasText:'CU10 web '+sello});
  await expect(fila).toBeVisible();
  await fila.getByRole('link',{name:'Variantes y precios'}).click();
  await expect(page).toHaveURL(/variantes\?producto_id=/);
  await expect(page.getByText('CU10-'+sello,{exact:true})).toBeVisible();
  await axe(page);
});

test('CU10 variantes valida duplicados y mantiene el histórico de precios',async({page})=>{
  await entrar(page);await page.goto('/variantes?producto_id='+datos.productoA);
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await axe(page);
  await page.getByRole('button',{name:'Nueva Variante',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.locator('#sku').fill('CU10-V-'+sello);
  await axe(page);
  await dialog.locator('button[type=submit]').first().click();
  await expect(dialog.locator('#producto_id')).toBeDisabled();
  await dialog.locator('#monto').fill('80');
  await dialog.getByRole('button',{name:'Añadir Precio',exact:true}).click();
  await expect(dialog.getByRole('cell',{name:/80/}).first()).toBeVisible();
  await dialog.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:'Nueva Variante',exact:true}).click();
  await dialog.locator('#sku').fill('CU10-otro-'+sello);
  await dialog.locator('button[type=submit]').first().click();
  await expect(dialog.getByRole('alert')).toContainText('Ya existe');
  await axe(page);
});

test('CU10 promociones conserva alcance de sucursales y valida descuentos',async({page})=>{
  await entrar(page);await page.goto('/promociones');
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await axe(page);
  await page.getByRole('button',{name:'Nueva promoción',exact:true}).click();
  await page.getByLabel('Nombre',{exact:true}).fill('CU10 promoción '+sello);
  await page.getByLabel('Valor',{exact:true}).fill('15');
  await page.getByLabel('Fecha inicio',{exact:true}).fill('2026-10-25');
  await page.getByLabel('Fecha fin',{exact:true}).fill('2026-12-31');
  await page.getByRole('group',{name:'Alcance por sucursal'}).getByRole('checkbox').first().check();
  await page.locator('.product-option').filter({hasText:'Prenda'}).first().getByRole('checkbox').check();
  await axe(page);
  await page.locator('button[type=submit]').click();
  const fila=page.getByRole('row').filter({hasText:'CU10 promoción '+sello});
  await expect(fila).toBeVisible();
  await fila.getByRole('button',{name:'Editar',exact:true}).click();
  await expect(page.getByRole('group',{name:'Alcance por sucursal'}).getByRole('checkbox').first()).toBeChecked();
  await page.getByLabel('Valor',{exact:true}).fill('101');
  await page.locator('button[type=submit]').click();
  await expect(page.getByRole('alert')).toContainText('máximo 100');
  await page.getByLabel('Valor',{exact:true}).fill('20');
  await page.locator('button[type=submit]').click();
  await fila.getByRole('button',{name:'Desactivar',exact:true}).click();
  await expect(fila.getByText('Inactiva',{exact:true})).toBeVisible();
  await fila.getByRole('button',{name:'Activar',exact:true}).click();
  await expect(fila.getByText('Activa',{exact:true})).toBeVisible();
});
