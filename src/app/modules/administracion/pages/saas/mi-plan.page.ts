import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { EstadoPlanService } from '../../../../core/services/estado-plan.service';
import { mensajeApi } from '../../../../core/services/error-api';
import { CapacidadesPlanComponent } from './capacidades-plan.component';
@Component({
  selector: 'app-mi-plan',
  imports: [CapacidadesPlanComponent],
  styleUrl: './saas.css',
  template: ` <header class="encabezado">
      <div>
        <p class="ceja">Mi empresa</p>
        <h1>Mi plan</h1>
        <p>Consulta vigencia, funciones y uso de tu empresa.</p>
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
        <h2>Capacidades de mi empresa</h2>
        <app-capacidades-plan [datos]="p" />
      </section>
    }`,
})
export class MiPlanPage {
  private readonly estado = inject(EstadoPlanService);
  private readonly destroy = inject(DestroyRef);
  protected readonly plan = this.estado.capacidades;
  protected readonly error = signal('');
  protected readonly cargando = signal(false);
  constructor() {
    this.cargar();
  }
  protected cargar(): void {
    if (this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    this.estado
      .refrescar()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({ error: (e) => this.error.set(mensajeApi(e)) });
  }
}
