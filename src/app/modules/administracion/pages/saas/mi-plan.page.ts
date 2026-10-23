import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { EstadoPlanService } from '../../../../core/services/estado-plan.service';
import { mensajeApi } from '../../../../core/services/error-api';
import { CUOTAS, FUNCIONES, MiPlan } from '../../models/saas.models';
import { SaasService } from '../../services/saas.service';

@Component({
  selector: 'app-mi-plan',
  imports: [DatePipe],
  styleUrl: './saas.css',
  template: `
    <header class="encabezado">
      <div>
        <p class="ceja">Mi empresa</p>
        <h1>Mi plan</h1>
        <p>Consulta la vigencia, las funciones y el uso de tu empresa.</p>
      </div>
      <button class="secundario" (click)="cargar()" [disabled]="cargando()">Actualizar</button>
    </header>
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    }
    @if (cargando()) {
      <p role="status">Consultando plan…</p>
    }
    @if (plan(); as p) {
      <section class="panel">
        <h2>{{ p.empresa_nombre }}</h2>
        <p>{{ p.plan_nombre || 'Sin plan asignado' }}</p>
        <div class="resumen">
          <div>
            Empresa<strong>{{ p.empresa_estado }}</strong>
          </div>
          <div>
            Suscripción<strong>{{ p.suscripcion_estado || 'Sin suscripción' }}</strong>
          </div>
          <div>
            Inicio<strong>{{
              p.fecha_inicio ? (p.fecha_inicio | date: 'dd/MM/yyyy' : 'UTC') : 'Sin fecha'
            }}</strong>
          </div>
          <div>
            Vencimiento<strong>{{
              p.fecha_vencimiento
                ? (p.fecha_vencimiento | date: 'dd/MM/yyyy' : 'UTC')
                : 'Sin vencimiento'
            }}</strong>
          </div>
        </div>
        @if (!p.operaciones_habilitadas) {
          <p class="aviso">
            Las operaciones nuevas están restringidas. Puedes consultar tus datos, pagar pendientes
            y gestionar devoluciones. Contacta a la administración de la plataforma para renovar o
            revisar tu plan.
          </p>
        }
        <table>
          <caption>
            Uso de registros activos
          </caption>
          <thead>
            <tr>
              <th scope="col">Recurso</th>
              <th scope="col">Uso</th>
              <th scope="col">Límite</th>
            </tr>
          </thead>
          <tbody>
            @for (clave of cuotas; track clave) {
              <tr>
                <th scope="row">{{ etiquetas[clave] }}</th>
                <td>{{ p.uso[clave] }}</td>
                <td>{{ p.limites?.[clave] ?? 'Sin límite' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
      <section class="panel">
        <h2>Funciones del plan</h2>
        <ul>
          @for (clave of funciones; track clave) {
            <li>
              {{ etiquetas[clave] }}: {{ habilitada(p, clave) ? 'Habilitada' : 'Deshabilitada' }}
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class MiPlanPage {
  private readonly api = inject(SaasService);
  private readonly estado = inject(EstadoPlanService);
  protected readonly plan = signal<MiPlan | null>(null);
  protected readonly error = signal('');
  protected readonly cargando = signal(false);
  protected readonly cuotas = CUOTAS;
  protected readonly funciones = FUNCIONES;
  protected readonly etiquetas = {
    usuarios: 'Cuentas',
    empleados: 'Empleados',
    productos: 'Productos',
    sucursales: 'Sucursales',
    recomendaciones: 'Recomendaciones',
    asistente: 'Asistente',
    reportes: 'Reportes',
    vestidor: 'Vestidor',
  };
  constructor() {
    this.cargar();
  }
  protected cargar(): void {
    this.error.set('');
    this.cargando.set(true);
    this.api
      .miPlan()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (p) => {
          this.plan.set(p);
          this.estado.aplicar(p.operaciones_habilitadas);
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
  protected habilitada(p: MiPlan, clave: (typeof FUNCIONES)[number]): boolean {
    return p.funciones?.[clave] ?? p.plan_codigo === 'STYLEAR_LEGADO';
  }
}
