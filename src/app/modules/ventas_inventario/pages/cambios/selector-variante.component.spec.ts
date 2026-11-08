import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SelectorVarianteComponent } from './selector-variante.component';

describe('Selección de reemplazo',()=>{
  it('separa productos con igual nombre y conserva únicamente tallas y colores disponibles',async()=>{
    const f=TestBed.createComponent(SelectorVarianteComponent);
    f.componentRef.setInput('opciones',[
      {id:1,producto_id:10,producto:'Camisa',talla:'S',color:'Negro',precio:'50',disponible:2},
      {id:2,producto_id:10,producto:'Camisa',talla:'M',color:'Azul',precio:'60',disponible:1},
      {id:3,producto_id:10,producto:'Camisa',talla:'M',color:'Negro',precio:'70',disponible:2},
      {id:4,producto_id:11,producto:'Camisa',talla:'XL',color:'Blanco',precio:'40',disponible:3},
    ]);
    f.detectChanges();
    const selects=()=>Array.from((f.nativeElement as HTMLElement).querySelectorAll('select'));
    const elegir=(n:number,v:string)=>{const select=selects()[n];select.value=v;select.dispatchEvent(new Event('change'));f.detectChanges();};
    expect(f.componentInstance.seleccion()).toBe(0);
    elegir(0,'10');elegir(1,'M');elegir(2,'Azul');
    expect(f.componentInstance.seleccion()).toBe(2);
    expect(Array.from(selects()[2].options).map(o=>o.text)).not.toContain('Blanco');
    elegir(0,'11');
    expect(f.componentInstance.seleccion()).toBe(4);
    expect(selects()[1].value).toBe('XL');
    f.destroy();
  });
});
