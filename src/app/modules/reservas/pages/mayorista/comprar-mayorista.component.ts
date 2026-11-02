import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MayoristaService, OpcionesMayorista, TipoPaquete } from '../../services/mayorista.service';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { TiendaStateService } from '../../../../core/services/tienda-state.service';
import { mensajeApi } from '../../../../core/services/error-api';
@Component({
 selector:'app-comprar-mayorista',
 styleUrl:'./mayorista.css',
 template:`
 <section aria-labelledby="mayorista-title">
  <h2 id="mayorista-title">Comprar por mayor</h2>
  <p>Paquetes fijos por modelo. Puedes combinarlos con unidades a precio normal. Los porcentajes no se acumulan con promociones.</p>
  @if (!sucursalId()) { <p>Selecciona una sucursal para consultar los paquetes y sus existencias.</p> }
  @if (cargando()) { <p role="status">Consultando paquetes…</p> }
  @if (error()) { <p role="alert">{{ error() }}</p><button type="button" (click)="cargar()" [disabled]="ocupado()">Actualizar paquetes</button> }
  @if (aviso()) { <p role="status">{{ aviso() }}</p> }
  @if (datos(); as d) {
   <div class="paquetes">
    @for (p of d.paquetes; track p.tipo) {
     <article>
      <h3>{{ nombre(p.tipo) }} · {{ p.cantidad }} prendas</h3>
      <p>{{ p.descuento === null ? 'Sin porcentaje configurado' : p.descuento + '% de descuento por prenda' }}</p>
      <p>{{ regla(p.tipo) }}</p>
      @if (p.motivo) { <p>{{ p.motivo }}</p> }
      <button type="button" [disabled]="!p.disponible || ocupado()" [attr.aria-pressed]="tipo()===p.tipo" (click)="elegir(p.tipo)">Armar {{ nombre(p.tipo) }}</button>
     </article>
    }
   </div>
   @if (opcion(); as p) {
    <fieldset [disabled]="ocupado() || !p.disponible">
     <legend>{{ nombre(p.tipo) }}: selecciona exactamente {{ p.cantidad }} prendas</legend>
     <p>{{ regla(p.tipo) }}</p>
     @for (v of d.variantes; track v.producto_variante_id) {
      <label [for]="'mayor-var-'+v.producto_variante_id">{{ v.talla }} / {{ v.color }} · stock {{ v.stock }} · {{ precio(v.precio_base,p.descuento) }} Bs por prenda</label>
      <input [id]="'mayor-var-'+v.producto_variante_id" type="number" min="0" [max]="p.cantidad" step="1" [value]="cantidades()[v.producto_variante_id] || 0" [disabled]="v.stock<1 || !v.precio_base" (input)="cantidad(v.producto_variante_id,$event)" />
     }
     <p role="status">Seleccionadas: {{ total() }} de {{ p.cantidad }}. Total del paquete: {{ monto() }} Bs.</p>
     <button type="button" [disabled]="total()!==p.cantidad || !p.disponible || ocupado()" (click)="agregar()">{{ ocupado() ? 'Agregando paquete…' : 'Agregar paquete al carrito' }}</button>
    </fieldset>
   }
  }
 </section>`
})
export class ComprarMayoristaComponent {
 readonly productoId=input.required<number>();
 readonly sucursalId=input<number|null>(null);
 private readonly api=inject(MayoristaService);
 private readonly auth=inject(AuthService);
 private readonly router=inject(Router);
 private readonly tienda=inject(TiendaStateService);
 protected readonly datos=signal<OpcionesMayorista|null>(null);
 protected readonly cargando=signal(false);
 protected readonly ocupado=signal(false);
 protected readonly error=signal('');
 protected readonly aviso=signal('');
 protected readonly tipo=signal<TipoPaquete|null>(null);
 protected readonly cantidades=signal<Record<number,number>>({});
 protected readonly opcion=computed(()=>this.datos()?.paquetes.find(p=>p.tipo===this.tipo()));
 protected readonly total=computed(()=>Object.values(this.cantidades()).reduce((a,b)=>a+b,0));
 protected readonly monto=computed(()=>{const p=this.opcion();return (this.datos()?.variantes.reduce((s,v)=>s+(this.cantidades()[v.producto_variante_id]||0)*Number(this.precio(v.precio_base,p?.descuento??null)),0)??0).toFixed(2);});
 private solicitud=0;
 private clave='';
 private huella='';
 constructor(){effect(()=>{this.productoId();this.sucursalId();this.cargar();});}
 protected cargar():void {
  const pid=this.productoId(),sid=this.sucursalId(),n=++this.solicitud;
  this.datos.set(null);this.tipo.set(null);this.cantidades.set({});this.error.set('');this.aviso.set('');this.clave='';
  if(!sid){this.cargando.set(false);return;}
  this.cargando.set(true);
  this.api.opciones(pid,sid).subscribe({next:d=>{if(n===this.solicitud){this.datos.set(d);this.cargando.set(false);}},error:(e:unknown)=>{if(n===this.solicitud){this.error.set(mensajeApi(e));this.cargando.set(false);}}});
 }
 protected elegir(t:TipoPaquete):void {this.tipo.set(t);this.cantidades.set({});this.error.set('');this.aviso.set('');}
 protected cantidad(id:number,e:Event):void {const n=Number((e.target as HTMLInputElement).value);this.cantidades.update(c=>({...c,[id]:Number.isInteger(n)&&n>=0&&n<=12?n:0}));this.aviso.set('');}
 protected nombre(t:TipoPaquete):string{return {CUARTA:'Cuarta',MEDIA:'Media docena',DOCENA:'Docena'}[t];}
 protected regla(t:TipoPaquete):string{return t==='CUARTA'?'Mínimo 2 tallas y 2 colores distintos.':t==='MEDIA'?'Mínimo 3 tallas y 3 colores distintos.':'Al menos una prenda de cada talla definida para este modelo; mínimo dos tallas.';}
 protected precio(base:number|string|null,pct:number|string|null):string {return base&&pct!==null?(Math.round((Number(base)*(1-Number(pct)/100)+Number.EPSILON)*100)/100).toFixed(2):'0.00';}
 protected agregar():void {
  if(!this.auth.estaAutenticado()){void this.router.navigate(['/login'],{queryParams:{returnUrl:this.router.url}});return;}
  const p=this.opcion(),sid=this.sucursalId();if(!p?.disponible||!sid||this.total()!==p.cantidad||this.ocupado())return;
  const data={producto_id:this.productoId(),sucursal_id:sid,tipo:p.tipo,seleccion:Object.entries(this.cantidades()).filter(([,n])=>n>0).map(([id,cantidad])=>({producto_variante_id:Number(id),cantidad}))};
  const huella=JSON.stringify(data);if(huella!==this.huella||!this.clave){this.clave=crypto.randomUUID();this.huella=huella;}
  const n=this.solicitud;this.ocupado.set(true);this.error.set('');
  this.api.agregar({...data,clave_operacion:this.clave}).pipe(finalize(()=>this.ocupado.set(false))).subscribe({next:c=>{if(n===this.solicitud){this.tienda.reemplazarCarritoDesdeBackend(c.items);this.aviso.set('Paquete agregado. Puedes agregar otro paquete o unidades normales.');this.cantidades.set({});this.clave='';}},error:(e:unknown)=>{if(n===this.solicitud)this.error.set(mensajeApi(e));}});
 }
}
