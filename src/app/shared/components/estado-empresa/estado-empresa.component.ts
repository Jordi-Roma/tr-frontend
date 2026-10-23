import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { timer } from 'rxjs';
import { EmpresaContextoService } from '../../../core/services/empresa-contexto.service';
import { EstadoPlanService } from '../../../core/services/estado-plan.service';
import { AuthService } from '../../../modules/autenticacion/services/auth.service';
import { SaasService } from '../../../modules/administracion/services/saas.service';

@Component({
  selector: 'app-estado-empresa',
  imports: [RouterLink],
  template: `
    <div class="contexto">
      <strong>{{
        auth.tieneRol('ADMIN_SAAS') ? 'Plataforma StyleAR' : empresa()?.nombre || 'StyleAR'
      }}</strong>
      @if (!auth.tieneRol('ADMIN_SAAS')) {
        <a routerLink="/empresa">Cambiar empresa</a>
      }
      @if (auth.tieneRol('ADMINISTRADOR')) {
        <a routerLink="/mi-plan">Mi plan</a>
      }
    </div>
    @if (!auth.tieneRol('ADMIN_SAAS') && !estado.operacionesPermitidas()) {
      <p class="aviso" role="status">
        Operaciones nuevas restringidas. Puedes consultar tus datos y resolver pagos pendientes,
        reservas existentes o devoluciones.
      </p>
    }
    @if (estado.mensaje()) {
      <div class="aviso" role="status">
        <p>{{ estado.mensaje() }}</p>
        <button type="button" (click)="estado.cerrarAviso()" aria-label="Cerrar aviso">
          Cerrar aviso
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 20px;
    }
    .contexto {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 18px;
      padding: 12px 0;
      border-bottom: 1px solid #d5d8ce;
    }
    a {
      color: #34472a;
      text-underline-offset: 3px;
    }
    .aviso {
      background: #f6f0dc;
      color: #514113;
      padding: 14px 18px;
      border-left: 4px solid #89651b;
      margin: 12px 0;
    }
    .aviso p {
      margin: 0 0 8px;
    }
    button {
      padding: 6px 10px;
      background: white;
      color: #514113;
      border: 1px solid #89651b;
      border-radius: 4px;
      cursor: pointer;
    }
    :is(a, button):focus-visible {
      outline: 3px solid #426621;
      outline-offset: 3px;
    }
  `,
})
export class EstadoEmpresaComponent {
  protected readonly auth = inject(AuthService);
  protected readonly empresa = inject(EmpresaContextoService).empresa;
  protected readonly estado = inject(EstadoPlanService);
  private readonly api = inject(SaasService);
  constructor() {
    if (this.auth.tieneRol('ADMINISTRADOR'))
      timer(0, 60000)
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          this.api.miPlan().subscribe({
            next: (p) => this.estado.aplicar(p.operaciones_habilitadas),
            error: () => {
              /* API interceptor displays permission/plan errors. */
            },
          });
        });
  }
}
