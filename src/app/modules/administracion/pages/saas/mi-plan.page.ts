import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { EstadoPlanService } from '../../../../core/services/estado-plan.service';
import { mensajeApi } from '../../../../core/services/error-api';
import { CapacidadesPlanComponent } from './capacidades-plan.component';
import { SaasService } from '../../services/saas.service';
import { SuscripcionStripe } from '../../models/saas.models';
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
    @if (stripe(); as s) {
      @if (s.puede_pagar || s.estado) {
        <section class="panel" aria-labelledby="suscripcion-stripe">
          <h2 id="suscripcion-stripe">Suscripción mensual</h2>
          @if (s.importe && s.moneda) {
            <p>{{ s.importe }} {{ s.moneda }} al mes</p>
          }
          @if (s.estado === 'ACTIVA') {
            <p>La renovación mensual está vinculada a Stripe de prueba.</p>
          } @else if (regresoDeStripe && s.estado === 'PENDIENTE') {
            <p role="status">Stripe está confirmando el pago. Actualiza para consultar la vigencia.</p>
          }
          @if (s.puede_pagar) {
            <button type="button" (click)="abrirStripe('checkout')" [disabled]="abriendoStripe()">
              {{ s.estado === 'PENDIENTE' ? 'Continuar en Stripe de prueba' : 'Suscribirme en Stripe de prueba' }}
            </button>
          }
          @if (s.puede_gestionar) {
            <button type="button" (click)="abrirStripe('portal')" [disabled]="abriendoStripe()">
              Gestionar suscripción en Stripe
            </button>
          }
        </section>
      }
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
  private readonly saas = inject(SaasService);
  private readonly destroy = inject(DestroyRef);
  protected readonly regresoDeStripe = inject(ActivatedRoute).snapshot.queryParamMap.get('stripe') === 'pendiente';
  protected readonly plan = this.estado.capacidades;
  protected readonly error = signal('');
  protected readonly cargando = signal(false);
  protected readonly abriendoStripe = signal(false);
  protected readonly stripe = signal<SuscripcionStripe | null>(null);
  constructor() {
    this.cargar();
  }
  protected cargar(): void {
    if (this.cargando()) return;
    this.error.set('');
    this.cargando.set(true);
    forkJoin({ plan: this.estado.refrescar(), stripe: this.saas.estadoSuscripcionStripe() })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: ({ stripe }) => this.stripe.set(stripe),
        error: (e) => this.error.set(mensajeApi(e)),
      });
  }

  protected abrirStripe(accion: 'checkout' | 'portal'): void {
    if (this.abriendoStripe()) return;
    this.error.set('');
    this.abriendoStripe.set(true);
    this.saas.abrirSuscripcionStripe(accion)
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
