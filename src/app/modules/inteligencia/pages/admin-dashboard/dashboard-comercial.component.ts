import { BarrasDashboardComponent } from './barras-dashboard.component';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ReportesService } from '../../services/reportes.service';
import { DashboardResultado, ReporteCatalogo } from '../../models/reporte.models';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { mensajeApi } from '../../../../core/services/error-api';
@Component({
  selector: 'app-dashboard-comercial',
  imports: [ReactiveFormsModule, KeyValuePipe, BarrasDashboardComponent],
  styleUrl: '../../../administracion/pages/saas/saas.css',
  styles: `
    .graficos-principales {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      margin: 1.5rem 0;
    }
    .filtros-dashboard {
      margin: 1.5rem 0;
    }
    .filtros-dashboard summary {
      cursor: pointer;
      padding: 1rem;
      background: #edf1e8;
      border-radius: 10px;
      font-weight: 600;
    }
    .filtros-dashboard form {
      padding: 1rem 0;
    }
    @media (max-width: 760px) {
      .graficos-principales {
        grid-template-columns: 1fr;
      }
    }
  `,
  template: ` <section class="panel">
    <h2>Dashboard comercial</h2>
    @if (resultado(); as r) {
      <p>Período: {{ r.filtros.fecha_desde }} al {{ r.filtros.fecha_hasta }}</p>
      <div class="graficos-principales">
        <app-barras-dashboard
          titulo="Ventas completadas por fecha"
          unidad="Cantidad de ventas"
          [datos]="ventasPorFecha(r)"
        />
        <app-barras-dashboard
          titulo="Importe vendido por fecha"
          unidad="Bolivianos (BOB)"
          [datos]="importesPorFecha(r)"
        />
        <app-barras-dashboard
          titulo="Canales de venta"
          unidad="Cantidad de ventas completadas"
          [datos]="[
            { etiqueta: 'Presencial', valor: r.datos.ventas_presenciales },
            { etiqueta: 'Digital', valor: r.datos.ventas_digitales },
          ]"
        />
        <app-barras-dashboard
          formato="ranking"
          titulo="Productos más vendidos"
          unidad="Unidades vendidas"
          [datos]="productosVendidos(r)"
        />
      </div>
    }
    <details class="filtros-dashboard">
      <summary>Ajustar período y filtros del dashboard</summary>
      <form [formGroup]="form" (ngSubmit)="cargar()">
        <div class="grid">
          <label for="dash-desde"
            >Desde<input
              id="dash-desde"
              type="date"
              formControlName="fecha_desde"
              required /></label
          ><label for="dash-hasta"
            >Hasta<input id="dash-hasta" type="date" formControlName="fecha_hasta" required
          /></label>
          <label for="dash-sucursal"
            >Sucursal<select id="dash-sucursal" formControlName="sucursal_id">
              @if (!encargado) {
                <option [ngValue]="null">Todas</option>
              }
              @for (s of catalogo()?.sucursales ?? []; track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }}</option>
              }
            </select></label
          >
          <label for="dash-canal"
            >Canal de venta<select id="dash-canal" formControlName="tipo_venta">
              <option [ngValue]="null">Todos</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="DIGITAL">Digital</option>
            </select></label
          >
          <label class="check"
            ><input type="checkbox" formControlName="comparar" />Comparar con período
            anterior</label
          >
        </div>
        <button [disabled]="cargando() || !catalogo()">Actualizar dashboard</button>
      </form>
    </details>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (cargando()) {
      <p role="status">Consultando métricas…</p>
    }
    @if (resultado(); as r) {
      <p>
        Consulta: {{ r.filtros.fecha_desde }} al {{ r.filtros.fecha_hasta }} · {{ r.generado_en }}
      </p>
      <div class="resumen">
        <div>
          Ventas completadas<strong>{{ r.datos.ventas }}</strong>
        </div>
        <div>
          Presenciales<strong>{{ r.datos.ventas_presenciales }}</strong>
        </div>
        <div>
          Digitales<strong>{{ r.datos.ventas_digitales }}</strong>
        </div>
        <div>
          Importe vendido ({{ r.datos.moneda_ventas }})<strong>{{
            r.datos.importe_vendido
          }}</strong>
        </div>
        <div>
          Reservas pendientes<strong>{{ r.datos.reservas_pendientes }}</strong>
        </div>
        <div>
          Reservas vencidas<strong>{{ r.datos.reservas_vencidas }}</strong>
        </div>
        <div>
          Existencias bajas actuales<strong>{{ r.datos.existencias_bajas }}</strong>
        </div>
      </div>
      <div class="tabla" tabindex="0" role="region" aria-label="Flujos por moneda">
        <table>
          <caption>
            Flujos registrados por moneda
          </caption>
          <thead>
            <tr>
              <th scope="col">Moneda</th>
              <th scope="col">Cobrado</th>
              <th scope="col">Reembolsado</th>
              <th scope="col">Neto</th>
            </tr>
          </thead>
          <tbody>
            @for (f of r.datos.flujos; track f.moneda) {
              <tr>
                <th scope="row">{{ f.moneda }}</th>
                <td>{{ f.cobrado }}</td>
                <td>{{ f.reembolsado }}</td>
                <td>{{ f.neto }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p>
        El neto es cobrado menos reembolsado; no representa ganancia. El inventario refleja
        existencias actuales y no se compara históricamente.
      </p>
      @if (r.comparacion; as c) {
        <h3>Comparación con {{ c.fecha_desde }} al {{ c.fecha_hasta }}</h3>
        <div class="tabla" tabindex="0" role="region" aria-label="Comparación comercial">
          <table>
            <caption>
              Valores de ambos períodos
            </caption>
            <thead>
              <tr>
                <th scope="col">Indicador</th>
                <th scope="col">Actual</th>
                <th scope="col">Anterior</th>
                <th scope="col">Diferencia</th>
                <th scope="col">Variación</th>
              </tr>
            </thead>
            <tbody>
              @for (i of c.indicadores | keyvalue; track i.key) {
                <tr>
                  <th scope="row">{{ etiqueta(i.key) }}</th>
                  <td>{{ i.value.actual }}</td>
                  <td>{{ i.value.anterior }}</td>
                  <td>{{ i.value.diferencia }}</td>
                  <td>
                    {{
                      i.value.variacion_porcentual === null
                        ? 'Sin porcentaje: base anterior cero'
                        : i.value.variacion_porcentual + ' %'
                    }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <h3>Serie de ventas</h3>
      <div class="tabla" tabindex="0" role="region" aria-label="Serie completa de ventas">
        <table>
          <caption>
            Ventas completadas por fecha
          </caption>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Ventas</th>
              <th scope="col">Importe BOB</th>
            </tr>
          </thead>
          <tbody>
            @for (v of r.datos.serie_ventas; track v.fecha) {
              <tr>
                <th scope="row">{{ v.fecha }}</th>
                <td>{{ v.ventas }}</td>
                <td>{{ v.importe }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3">Sin datos</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <h3>Productos más vendidos</h3>
      <ul>
        @for (p of r.datos.productos_mas_vendidos; track p.id) {
          <li>{{ p.nombre }} · {{ p.sku }} · {{ p.unidades }} unidades · {{ p.importe }} BOB</li>
        } @empty {
          <li>Sin datos</li>
        }
      </ul>
      <details>
        <summary>Cómo se calculan las métricas</summary>
        @for (d of r.definiciones | keyvalue; track d.key) {
          <p>{{ d.value }}</p>
        }
      </details>
    }
  </section>`,
})
export class DashboardComercialComponent {
  private readonly api = inject(ReportesService);
  private readonly destroy = inject(DestroyRef);
  protected readonly encargado = !inject(AuthService).tieneRol('ADMINISTRADOR');
  protected readonly resultado = signal<DashboardResultado | null>(null);
  protected readonly catalogo = signal<ReporteCatalogo | null>(null);
  protected readonly error = signal('');
  protected readonly cargando = signal(false);
  private revision = 0;
  private hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  protected readonly form = new FormGroup({
    fecha_desde: new FormControl(this.hoy.slice(0, 7) + '-01', { nonNullable: true }),
    fecha_hasta: new FormControl(this.hoy, { nonNullable: true }),
    sucursal_id: new FormControl<number | null>(null),
    tipo_venta: new FormControl<'PRESENCIAL' | 'DIGITAL' | null>(null),
    comparar: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    inject(CambioContextoService)
      .cambio$.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.revision++;
        this.resultado.set(null);
        this.catalogo.set(null);
        this.form.reset();
      });
    this.api
      .catalogo()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (c) => {
          this.catalogo.set(c);
          if (this.encargado) this.form.controls.sucursal_id.setValue(c.sucursales[0]?.id ?? null);
          this.cargar();
        },
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
  protected cargar(): void {
    const f = this.form.getRawValue();
    if (!f.fecha_desde || !f.fecha_hasta || f.fecha_desde > f.fecha_hasta) {
      this.error.set('Revisa las fechas.');
      return;
    }
    const revision = ++this.revision;
    this.cargando.set(true);
    this.error.set('');
    this.api
      .dashboard(f)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (revision === this.revision) this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (r) => {
          if (revision === this.revision) this.resultado.set(r);
        },
        error: (e) => {
          if (revision === this.revision) this.error.set(mensajeApi(e));
        },
      });
  }
  protected ventasPorFecha(r: DashboardResultado) {
    return r.datos.serie_ventas.map((v) => ({ etiqueta: v.fecha, valor: v.ventas }));
  }
  protected importesPorFecha(r: DashboardResultado) {
    return r.datos.serie_ventas.map((v) => ({ etiqueta: v.fecha, valor: Number(v.importe) }));
  }
  protected productosVendidos(r: DashboardResultado) {
    return r.datos.productos_mas_vendidos.map((p) => ({ etiqueta: p.nombre, valor: p.unidades }));
  }
  protected etiqueta(k: string): string {
    return k.replaceAll('_', ' ');
  }
}
