import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
export interface AccesoModulo { nombre: string; ruta: string; icono: string; }
@Component({
  selector: 'app-accesos-modulo',
  imports: [RouterLink],
  template: `<nav [attr.aria-label]="etiqueta()" class="access-grid">
    @for (a of accesos(); track a.ruta) {
      <a [routerLink]="a.ruta" class="access-tile"><i [class]="a.icono" aria-hidden="true"></i><span>{{ a.nombre }}</span></a>
    }
  </nav>`,
  styles: [`:host{display:block;margin:1.25rem 0}.access-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,160px));gap:12px}.access-tile{min-height:112px;aspect-ratio:1;box-sizing:border-box;padding:18px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border:1px solid #b8c3ad;border-radius:14px;background:#fff;color:#304226;text-decoration:none;text-align:center;font-weight:650}.access-tile:hover{background:#eef3e9;border-color:#4d6537}.access-tile:focus-visible{outline:3px solid #354c22;outline-offset:3px}.access-tile i{font-size:1.5rem}`],
})
export class AccesosModuloComponent {
  readonly accesos = input.required<readonly AccesoModulo[]>();
  readonly etiqueta = input('Accesos del módulo');
}
