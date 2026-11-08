import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { finalize, map, switchMap, take, takeWhile, timer } from 'rxjs';
import { EstadoPlanService } from '../../../../core/services/estado-plan.service';
import { mensajeApi } from '../../../../core/services/error-api';
import { CapacidadesPlanComponent } from './capacidades-plan.component';
import { SaasService } from '../../services/saas.service';
import { SuscripcionStripe } from '../../models/saas.models';
@Component({
  selector: 'app-mi-plan',
  imports: [CapacidadesPlanComponent, DecimalPipe],
  styleUrls: ['./saas.css', './planes.page.css', './mi-plan.page.css'],
  templateUrl: './mi-plan.page.html',
})
export class MiPlanPage {
  private readonly estado = inject(EstadoPlanService);
  private readonly saas = inject(SaasService);
  private readonly destroy = inject(DestroyRef);
  protected readonly regresoDeStripe = inject(ActivatedRoute).snapshot.queryParamMap.get('stripe') === 'pendiente';
  protected readonly plan = this.estado.capacidades;
  protected readonly error = signal('');
  protected readonly cargando = signal(false);
  protected readonly abriendoStripe = signal(false);
  protected readonly stripe = signal<SuscripcionStripe | null>(null);
  protected readonly cupos = [
    { clave: 'usuarios', nombre: 'Usuarios' },
    { clave: 'empleados', nombre: 'Empleados' },
    { clave: 'sucursales', nombre: 'Sucursales' },
  ];
  protected readonly funciones = [
    { clave: 'reportes_pdf', nombre: 'Reportes en PDF' },
    { clave: 'reportes_excel', nombre: 'Reportes en Excel' },
    { clave: 'reportes_voz', nombre: 'Reportes por voz' },
    { clave: 'reportes_programacion', nombre: 'Reportes programados' },
    { clave: 'respaldos_automaticos', nombre: 'Respaldos automáticos' },
  ];

  constructor() {
    this.cargar();
    if (this.regresoDeStripe) {
      timer(3000, 3000)
        .pipe(
          take(10),
          takeWhile(() => !this.stripe() || this.stripe()?.estado === 'PENDIENTE'),
          takeUntilDestroyed(this.destroy),
        )
        .subscribe(() => this.cargar());
    }
  }
  protected cargar(): void {
    if (this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    this.saas.estadoSuscripcionStripe()
      .pipe(
        switchMap((stripe) => this.estado.refrescar().pipe(map(() => stripe))),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (stripe) => this.stripe.set(stripe),
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }

  protected abrirStripe(accion: 'checkout' | 'portal', planId?: number): void {
    if (this.abriendoStripe()) return;
    this.error.set('');
    this.abriendoStripe.set(true);
    this.saas.abrirSuscripcionStripe(accion, planId)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.abriendoStripe.set(false)),
      )
      .subscribe({
        next: ({ url }) => globalThis.location.assign(url),
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }
}
