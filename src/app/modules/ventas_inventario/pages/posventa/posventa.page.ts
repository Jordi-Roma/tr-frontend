import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { AccesosModuloComponent, AccesoModulo } from '../../../../shared/components/accesos-modulo/accesos-modulo.component';
@Component({
  imports: [AccesosModuloComponent],
  template: `<section class="posventa" aria-labelledby="posventa-titulo"><h1 id="posventa-titulo">Devoluciones y cambios</h1><p>Elige una opción para consultar solicitudes o configurar la política de tu empresa.</p><app-accesos-modulo [accesos]="accesos" etiqueta="Opciones de posventa" /></section>`,
  styles: [`.posventa{padding:24px;max-width:1000px;margin:auto}`],
})
export class PosventaPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cliente = this.route.snapshot.data['vista'] === 'cliente';
  readonly accesos: AccesoModulo[] = [
    {nombre:'Devoluciones',ruta:this.cliente ? '/mis-devoluciones/solicitudes' : '/devoluciones/solicitudes',icono:'pi pi-replay'},
    {nombre:'Cambios',ruta:'/cambios',icono:'pi pi-sync'},
    ...(this.auth.tieneRol('ADMINISTRADOR') ? [{nombre:'Políticas posventa',ruta:'/politicas-posventa',icono:'pi pi-book'}] : []),
  ];
  constructor() {
    if (this.route.snapshot.queryParamMap.has('seleccion')) void this.router.navigate([this.accesos[0].ruta], {queryParams:this.route.snapshot.queryParams,replaceUrl:true});
  }
}
