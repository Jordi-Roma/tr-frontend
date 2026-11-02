import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const d=JSON.parse(readFileSync('e2e/.fixture.json','utf8')) as {a:{codigo:string};b:{codigo:string};clienteA:string;clienteB:string;encargado:string;cajero:string;sucursalA:number;varianteA:number};
const api='http://127.0.0.1:58127/api/v1';
test.beforeEach(async({page})=>{
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1'&&u.port==='8000')return r.continue({url:r.request().url().replace(':8000',':58127')});if(['127.0.0.1','localhost'].includes(u.hostname))return r.continue();return r.abort();});
 page.on('dialog',r=>r.accept());
});
async function entrar(page:Page,usuario:string,codigo=d.a.codigo){await page.goto('/e/'+codigo);await expect(page).toHaveURL(/\/inicio$/);await page.goto('/login');await page.getByLabel('Usuario o correo').fill(usuario);await page.getByLabel('Contrasena',{exact:true}).fill('Prueba-aislada-123');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);}
async function cambiarCuenta(page:Page,u:string,codigo=d.a.codigo){await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await entrar(page,u,codigo);}
async function axe(page:Page){expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);}
test('CU18 cotiza dirección, acepta envío, paga y confirma entrega con incidencia',async({page,request})=>{
 test.setTimeout(120000);
 async function acceso(usuario:string){const r=await request.post(api+'/autenticacion/login',{data:{identificador:usuario,password:'Prueba-aislada-123',empresa_codigo:d.a.codigo}});expect(r.ok()).toBeTruthy();return {'Authorization':'Bearer '+(await r.json()).access_token,'X-Empresa-Codigo':d.a.codigo};}
 const ha=await acceso(d.a.codigo),h=await acceso(d.clienteA);
 const cfg=await (await request.get(api+'/pagos-empresa/configuracion',{headers:ha})).json();expect((await request.put(api+'/pagos-empresa/configuracion',{headers:ha,data:{version:cfg.version,qr_habilitado:true}})).ok()).toBeTruthy();
 const ciudades=await (await request.get(api+'/ciudades',{headers:ha})).json();
 expect((await request.post(api+'/perfil/direcciones',{headers:h,data:{ciudad_id:ciudades[0].id,direccion:'Avenida prueba 123',referencia:'Portón verde',es_principal:true}})).ok()).toBeTruthy();
 const existentes=await (await request.get(api+'/delivery/mis-deliveries',{headers:h})).json();
 const inv=await (await request.get(api+`/inventario?producto_variante_id=${d.varianteA}`,{headers:ha})).json();
 if(inv[0].stock_disponible<10)expect((await request.post(api+'/movimientos-inventario',{headers:ha,data:{sucursal_id:d.sucursalA,producto_variante_id:d.varianteA,tipo:'AJUSTE_POSITIVO',cantidad:10-inv[0].stock_disponible,motivo:'Preparar existencias en fixture desechable'}})).ok()).toBeTruthy();
 await request.delete(api+'/carrito',{headers:h});expect((await request.post(api+'/carrito/items',{headers:h,data:{producto_variante_id:d.varianteA,sucursal_id:d.sucursalA,cantidad:1}})).ok()).toBeTruthy();
 await entrar(page,d.clienteA);await page.goto('/carrito');await page.getByRole('button',{name:'Delivery',exact:true}).click();
 await page.getByLabel('Dirección guardada (opcional)').selectOption({label:'Avenida prueba 123'});
 await expect(page.getByText('Acepto la cotización del envío mostrada')).toBeVisible();
 const pagar=page.getByRole('button',{name:'Pagar delivery con QR de prueba',exact:true});await expect(pagar).toBeDisabled();await axe(page);
 await page.getByLabel('Acepto la cotización del envío mostrada').check();await expect(pagar).toBeEnabled();await pagar.click();
 expect(await (await request.get(api+'/delivery/mis-deliveries',{headers:h})).json()).toEqual(existentes);
 await page.getByRole('link',{name:'Consultar estado o cancelar intento'}).click();await page.getByRole('button',{name:'Simular pago aprobado',exact:true}).click();
 await expect(page.locator('.status-pill')).toHaveText('Aprobado');
 const ds=await (await request.get(api+'/delivery/mis-deliveries',{headers:h})).json();expect(ds).toHaveLength(existentes.length+1);const did=ds[0].id;
 await page.goto('/mis-deliveries/'+did);await expect(page.locator('.state')).toHaveText('PENDIENTE');await expect(page.getByRole('heading',{name:'Historial del seguimiento'})).toBeVisible();await axe(page);
 await cambiarCuenta(page,d.encargado);await page.goto('/delivery/'+did);
 await page.getByRole('combobox',{name:'Estado',exact:true}).selectOption('EN_PREPARACION');await page.getByRole('button',{name:'Guardar estado',exact:true}).click();await expect(page.locator('.state')).toHaveText('EN_PREPARACION');
 await page.getByRole('combobox',{name:'Estado',exact:true}).selectOption('EN_CAMINO');await page.getByRole('button',{name:'Guardar estado',exact:true}).click();await expect(page.locator('.state')).toHaveText('EN_CAMINO');
 await page.getByLabel('Observación',{exact:true}).fill('No se pudo contactar al destinatario');await page.getByRole('button',{name:'Registrar incidencia',exact:true}).click();await expect(page.getByText('Hay una incidencia pendiente', {exact:false})).toBeVisible();await axe(page);
 await page.getByRole('combobox',{name:'Estado',exact:true}).selectOption('ENTREGADO');await page.getByLabel('Confirmo que la entrega física se realizó').check();await expect(page.getByRole('button',{name:'Guardar estado',exact:true})).toBeDisabled();
 await page.getByLabel('Observación',{exact:true}).fill('Contacto restablecido y recepción coordinada');await page.getByRole('button',{name:'Resolver incidencia',exact:true}).click();await expect(page.getByText('Hay una incidencia pendiente',{exact:false})).not.toBeVisible();
 await page.getByRole('combobox',{name:'Estado',exact:true}).selectOption('ENTREGADO');await page.getByLabel('Confirmo que la entrega física se realizó').check();await page.getByRole('button',{name:'Guardar estado',exact:true}).click();await expect(page.getByRole('heading',{name:'Tu pedido ha sido entregado',exact:true})).toBeVisible();await axe(page);
 await cambiarCuenta(page,d.clienteA);await page.goto('/mis-deliveries/'+did);await expect(page.locator('.state')).toHaveText('ENTREGADO');await expect(page.getByRole('button',{name:'Guardar estado',exact:true})).not.toBeVisible();await axe(page);
 await cambiarCuenta(page,d.clienteB,d.b.codigo);await page.goto('/mis-deliveries/'+did);await expect(page.getByText('Delivery no encontrado.',{exact:false})).toBeVisible();await expect(page.getByText('Avenida prueba 123, Santa Cruz',{exact:true})).not.toBeVisible();
});
