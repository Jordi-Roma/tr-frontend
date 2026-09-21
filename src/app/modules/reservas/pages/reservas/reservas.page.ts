import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ReservaResponse } from '../../models/reservas.models';
import { ReservasService } from '../../services/reservas.service';

@Component({
  imports: [RouterLink],
  selector: 'app-reservas-page',
  styleUrl: './reservas.page.css',
  templateUrl: './reservas.page.html',
})
export class ReservasPage implements OnInit {
  private readonly reservasService = inject(ReservasService);

  protected readonly reservas = signal<ReservaResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.cargarReservas();
  }

  protected formatPrecio(value: number | string | null | undefined): string {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? `Bs ${parsed.toFixed(2)}` : 'Bs 0.00';
  }

  protected formatFecha(value: string): string {
    return new Date(value).toLocaleString('es-BO');
  }

  private cargarReservas(): void {
    this.cargando.set(true);
    this.error.set('');

    this.reservasService
      .listarMisReservas()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (reservas) => this.reservas.set(reservas),
        error: (error: HttpErrorResponse) => this.error.set(this.obtenerMensajeError(error)),
      });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;

      if (typeof detail === 'string') {
        return detail;
      }
    }

    return 'No se pudieron cargar tus reservas.';
  }
}
