import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ConfigMayorista, MayoristaService, TipoPaquete } from '../../../reservas/services/mayorista.service';
import { mensajeApi } from '../../../../core/services/error-api';
@Component({
 selector:'app-precios-mayoristas',imports:[ReactiveFormsModule,RouterLink],
 styleUrl:'../../../reservas/pages/mayorista/mayorista.css',
 template:`<h1>Descuentos mayoristas por producto</h1><p>{{ nombre }}. Cada porcentaje pertenece sólo a este modelo y empresa.</p>
 <a routerLink="/productos">Volver a productos</a>
 <p>El porcentaje se aplica al precio unitario vigente de cada variante, sin acumular promociones. Sin porcentaje configurado, el paquete permanece deshabilitado.</p>
 @if(error()){<p role="alert">{{ error() }}</p>}
 @if(aviso()){<p role="status">{{ aviso() }}</p>}
 <button type="button" (click)="cargar()" [disabled]="ocupado()">Actualizar porcentajes</button>
 @for(f of filas();track f.tipo){
  <section><h2>{{ etiquetas[f.tipo] }}</h2>
   <form [formGroup]="f.form" (ngSubmit)="guardar(f)">
    <label [for]="'porcentaje-'+f.tipo">Descuento {{ etiquetas[f.tipo] }} (%)</label>
    <input [id]="'porcentaje-'+f.tipo" type="number" min="0.01" max="99.99" step="0.01" formControlName="descuento" />
    <label><input type="checkbox" formControlName="habilitado" /> Habilitar {{ etiquetas[f.tipo] }}</label>
    <p>La disponibilidad también depende de tallas, colores y stock. Los paquetes son de {{ cantidades[f.tipo] }} prendas.</p>
    <button type="submit" [disabled]="ocupado() || f.form.invalid || (f.form.controls.habilitado.value && f.form.controls.descuento.value===null)">Guardar {{ etiquetas[f.tipo] }}</button>
   </form>
  </section>
 }
 `
})
export class PreciosMayoristasPage {
 private readonly api=inject(MayoristaService);
 private readonly route=inject(ActivatedRoute);
 protected readonly pid=Number(this.route.snapshot.queryParamMap.get('producto_id'));
 protected readonly nombre=this.route.snapshot.queryParamMap.get('nombre')||'Producto seleccionado';
 protected readonly etiquetas:Record<TipoPaquete,string>={CUARTA:'Cuarta',MEDIA:'Media docena',DOCENA:'Docena'};
 protected readonly cantidades:Record<TipoPaquete,number>={CUARTA:3,MEDIA:6,DOCENA:12};
 protected readonly filas=signal<Fila[]>([]);
 protected readonly ocupado=signal(false);
 protected readonly error=signal('');
 protected readonly aviso=signal('');
 constructor(){this.cargar();}
 protected cargar():void{
  if(!Number.isSafeInteger(this.pid)||this.pid<=0){this.error.set('Selecciona el producto desde la lista de productos.');return;}
  this.ocupado.set(true);this.error.set('');
  this.api.configuracion(this.pid).pipe(finalize(()=>this.ocupado.set(false))).subscribe({next:cfg=>this.armar(cfg),error:(e:unknown)=>{this.filas.set([]);this.error.set(mensajeApi(e));}});
 }
 private armar(cfg:ConfigMayorista[]):void{this.filas.set(cfg.map(c=>({tipo:c.tipo,version:c.version,form:new FormGroup({descuento:new FormControl<number|null>(c.descuento===null?null:Number(c.descuento),[Validators.min(.01),Validators.max(99.99)]),habilitado:new FormControl(c.habilitado,{nonNullable:true})})})));}
 protected guardar(f:Fila):void{
  if(this.ocupado()||f.form.invalid)return;
  this.ocupado.set(true);this.error.set('');this.aviso.set('');
  this.api.guardar(this.pid,{tipo:f.tipo,version:f.version,...f.form.getRawValue()}).pipe(finalize(()=>this.ocupado.set(false))).subscribe({next:cfg=>{this.armar(cfg);this.aviso.set('Porcentaje guardado para este producto.');},error:(e:unknown)=>this.error.set(mensajeApi(e))});
 }
}
type Fila={tipo:TipoPaquete;version:number;form:FormGroup<{descuento:FormControl<number|null>;habilitado:FormControl<boolean>}>};
