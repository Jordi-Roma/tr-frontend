import { Component, computed, input, model } from '@angular/core';
export interface VarianteCambio { id:number; producto_id?:number; producto:string; talla:string; color:string; precio:string|number; disponible:number; }
@Component({
  selector:'app-selector-variante',
  template:`<fieldset><legend>{{ etiqueta() }}</legend>
    <label>Producto<select [value]="producto()" (change)="cambiar('producto',$event)"><option value="">Selecciona un producto</option>@for(p of productos();track p.clave){<option [value]="p.clave" [selected]="p.clave===producto()">{{p.nombre}}</option>}</select></label>
    <label>Talla<select [value]="actual()?.talla || ''" [disabled]="!actual()" (change)="cambiar('talla',$event)"><option value="">Selecciona una talla</option>@for(t of tallas();track t){<option [value]="t" [selected]="t===actual()?.talla">{{t}}</option>}</select></label>
    <label>Color<select [value]="actual()?.color || ''" [disabled]="!actual()" (change)="cambiar('color',$event)"><option value="">Selecciona un color</option>@for(c of colores();track c){<option [value]="c" [selected]="c===actual()?.color">{{c}}</option>}</select></label>
    @if(actual();as v){<p>Bs {{v.precio}} por prenda · {{v.disponible}} disponibles</p>}
    @if(!opciones().length){<p>No hay variantes disponibles para esta cantidad.</p>}
  </fieldset>`,
  styles:[`fieldset{border:1px solid #bac3b2;border-radius:12px;padding:16px;margin:12px 0;display:flex;flex-wrap:wrap;gap:12px}legend{font-weight:650}label{display:flex;flex-direction:column;gap:6px;flex:1;min-width:140px}select{min-height:44px;border:1px solid #7b866e;border-radius:7px;padding:8px;background:white;color:#20251c;width:100%}p{width:100%;margin:4px 0}select:focus-visible{outline:3px solid #3e572d;outline-offset:2px}`],
})
export class SelectorVarianteComponent {
  readonly opciones=input.required<readonly VarianteCambio[]>();
  readonly seleccion=model(0);
  readonly etiqueta=input('Prenda de reemplazo');
  readonly actual=computed(()=>this.opciones().find(v=>v.id===this.seleccion()));
  private clave(v:VarianteCambio):string{return String(v.producto_id??v.producto);}
  readonly producto=computed(()=>this.actual()?this.clave(this.actual()!):'');
  readonly productos=computed(()=>Array.from(new Map(this.opciones().map(v=>[this.clave(v),{clave:this.clave(v),nombre:v.producto}])).values()));
  readonly tallas=computed(()=>[...new Set(this.opciones().filter(v=>this.clave(v)===this.producto()).map(v=>v.talla))]);
  readonly colores=computed(()=>[...new Set(this.opciones().filter(v=>this.clave(v)===this.producto()&&v.talla===this.actual()?.talla).map(v=>v.color))]);
  protected cambiar(campo:'producto'|'talla'|'color',event:Event):void{
    const valor=(event.target as HTMLSelectElement).value;
    const candidatos=this.opciones().filter(v=>campo==='producto'?this.clave(v)===valor:this.clave(v)===this.producto()&&(campo==='talla'?v.talla===valor:v.talla===this.actual()?.talla&&v.color===valor));
    this.seleccion.set(candidatos.find(v=>v.color===this.actual()?.color)?.id??candidatos[0]?.id??0);
  }
}
