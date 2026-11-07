import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CapacidadesPlan } from '../../../../core/models/capacidades-plan.models';

@Component({
  selector: 'app-capacidades-plan',
  imports: [DatePipe],
  styleUrl: './saas.css',
  template: `@if (datos(); as p) {
    <h3>{{ p.plan.nombre || 'Sin plan asignado' }}</h3>
    <p>
      Suscripción: {{ p.suscripcion.estado || 'Sin suscripción' }} · Inicio:
      {{ p.suscripcion.fecha_inicio | date: 'dd/MM/yyyy' : 'UTC' }} · Vencimiento:
      {{
        p.suscripcion.fecha_vencimiento
          ? (p.suscripcion.fecha_vencimiento | date: 'dd/MM/yyyy' : 'UTC')
          : 'Sin vencimiento'
      }}
    </p>
    @if (!p.operaciones_habilitadas) {
      <p class="aviso">
        Operaciones nuevas restringidas. Puedes consultar tus datos y resolver pendientes.
      </p>
    }
    <div class="tabla" tabindex="0" role="region" aria-label="Uso y cupos desplazables">
      <table>
        <caption>
          Uso y cupos del plan
        </caption>
        <thead>
          <tr>
            <th scope="col">Recurso</th>
            <th scope="col">Uso</th>
            <th scope="col">Límite</th>
            <th scope="col">Disponibles</th>
          </tr>
        </thead>
        <tbody>
          @for (c of p.catalogo.limites; track c.clave) {
            @if (p.cupos[c.clave]; as cupo) {
              <tr>
                <th scope="row">{{ c.nombre }}</th>
                <td>{{ cupo.uso }}</td>
                <td>{{ cupo.limite ?? 'Sin límite' }}</td>
                <td>
                  {{ cupo.disponibles ?? 'Sin límite' }}
                  @if (cupo.agotado) {
                    <small>Cupo agotado</small>
                  }
                </td>
              </tr>
            } @else {
              <tr>
                <th scope="row">{{ c.nombre }}</th>
                <td colspan="3">{{ p.limites[c.clave] ?? 'Sin límite' }} {{ c.unidad }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
    <h3>Funciones</h3>
    <ul>
      @for (f of p.catalogo.funciones; track f.clave) {
        <li>
          {{ f.nombre }}:
          {{
            p.funciones[f.clave]?.habilitada ? 'Habilitada' : motivo(p.funciones[f.clave]?.motivo)
          }}
        </li>
      }
    </ul>
    <p>
      Reportes básicos, mayorista, delivery, asistente, recomendaciones y vestidor se incluyen sin
      diferenciar planes, según los permisos de tu cuenta.
    </p>
    <p>
      Un empleado con cuenta consume también un usuario. La cuota de respaldos manuales contempla
      los últimos siete días.
    </p>
  }`,
})
export class CapacidadesPlanComponent {
  readonly datos = input.required<CapacidadesPlan>();
  protected motivo(m: string | null | undefined): string {
    return m === 'SUSCRIPCION_NO_VIGENTE' ? 'Suscripción no vigente' : 'No incluido en el plan';
  }
}
