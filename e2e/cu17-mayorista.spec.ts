import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
const d=JSON.parse(readFileSync('e2e/.fixture.json','utf8')) as {a:{codigo:string};clienteA:string;productoA:number;varianteA:number;sucursalA:number;variantesMayorista:number[]};
const api='http://127.0.0.1:18127/api/v1';
test.beforeEach(async({page})=>{
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1'&&u.port==='8000')return r.continue({url:r.request().url().replace(':8000',':18127')});if(['127.0.0.1','localhost'].includes(u.hostname))return r.continue();return r.abort();});
 page.on('dialog',r=>r.accept());
});
async function entrar(page:Page,u:string){await page.goto('/e/'+d.a.codigo);await expect(page).toHaveURL(/\/inicio$/);await page.goto('/login');await page.getByLabel('Usuario o correo').fill(u);await page.getByLabel('Contrasena',{exact:true}).fill('Prueba-aislada-123');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);}
async function axe(page:Page){expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);}
test('CU17 porcentajes por producto, paquete fijo y unidades con pago mixto',async({page,request})=>{
 test.setTimeout(90000);
 await entrar(page,d.a.codigo);await page.goto('/productos');
 const producto=page.getByRole('row').filter({hasText:'Prenda Empresa A'});await producto.getByRole('link',{name:'Descuentos mayoristas'}).click();
 await expect(page.getByRole('heading',{name:'Descuentos mayoristas por producto'})).toBeVisible();
 await page.getByLabel('Descuento Cuarta (%)',{exact:true}).fill('10');await page.getByLabel('Habilitar Cuarta',{exact:true}).check();
 await page.getByRole('button',{name:'Guardar Cuarta',exact:true}).click();await expect(page.getByRole('status')).toContainText('guardado');await axe(page);
 const adminLogin=await request.post(api+'/autenticacion/login',{data:{identificador:d.a.codigo,password:'Prueba-aislada-123',empresa_codigo:d.a.codigo}});expect(adminLogin.ok()).toBeTruthy();
 const ah={Authorization:'Bearer '+(await adminLogin.json()).access_token,'X-Empresa-Codigo':d.a.codigo};
 const cfg=await (await request.get(api+'/pagos-empresa/configuracion',{headers:ah})).json();expect((await request.put(api+'/pagos-empresa/configuracion',{headers:ah,data:{version:cfg.version,qr_habilitado:true}})).ok()).toBeTruthy();
 const cl=await request.post(api+'/autenticacion/login',{data:{identificador:d.clienteA,password:'Prueba-aislada-123',empresa_codigo:d.a.codigo}});const h={Authorization:'Bearer '+(await cl.json()).access_token,'X-Empresa-Codigo':d.a.codigo};
 const stock=await (await request.get(api+`/inventario?producto_variante_id=${d.varianteA}`,{headers:ah})).json();
 if(stock[0].stock_disponible<20)expect((await request.post(api+'/movimientos-inventario',{headers:ah,data:{sucursal_id:d.sucursalA,producto_variante_id:d.varianteA,tipo:'AJUSTE_POSITIVO',cantidad:20-stock[0].stock_disponible,motivo:'Preparar prueba desechable'}})).ok()).toBeTruthy();
 await request.delete(api+'/carrito',{headers:h});expect((await request.post(api+'/carrito/items',{headers:h,data:{producto_variante_id:d.varianteA,sucursal_id:d.sucursalA,cantidad:2}})).ok()).toBeTruthy();
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await entrar(page,d.clienteA);await page.goto('/producto/'+d.productoA);
 await page.getByLabel('Sucursal para carrito').selectOption(String(d.sucursalA));
 await expect(page.getByRole('heading',{name:'Comprar por mayor',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Armar Cuarta',exact:true}).click();
 await page.locator('#mayor-var-'+d.variantesMayorista[0]).fill('1');await page.locator('#mayor-var-'+d.variantesMayorista[1]).fill('2');
 await expect(page.getByRole('button',{name:'Agregar paquete al carrito'})).toBeEnabled();await axe(page);
 await page.getByRole('button',{name:'Agregar paquete al carrito'}).click();await expect(page.getByText('Paquete agregado.',{exact:false})).toBeVisible();
 await page.goto('/carrito');await expect(page.getByText('Compra por unidad',{exact:true})).toBeVisible();await expect(page.getByText(/CUARTA · paquete/)).toHaveCount(2);
 await expect(page.getByRole('button',{name:'Reservar gratis por 7 días'})).toBeDisabled();await expect(page.getByRole('button',{name:'Pagar con QR de prueba y retirar'})).toBeEnabled();await axe(page);
 await page.getByRole('button',{name:'Pagar con QR de prueba y retirar'}).click();
 await page.getByRole('button',{name:'Simular pago aprobado',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Detalle del pago',exact:true})).toBeVisible();
 await expect(page.locator('.status-pill')).toHaveText('Aprobado');
 await expect(page.getByRole('cell',{name:/CUARTA/})).toHaveCount(2);await axe(page);
 const cart=await (await request.get(api+'/carrito',{headers:h})).json();expect(cart.items).toEqual([]);
});
