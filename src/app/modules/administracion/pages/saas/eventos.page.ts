import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { mensajeApi } from '../../../../core/services/error-api';
import { EventoPlataforma } from '../../models/saas.models';
import { SaasService } from '../../services/saas.service';

@Component({
  selector: 'app-saas-eventos',
  imports: [DatePipe],
  styleUrl: './saas.css',
  template: `
    <header class="encabezado">
      <div>
        <p class="ceja">Plataforma</p>
        <h1>Eventos de plataforma</h1>
        <p>Auditoría de empresas, planes, suscripciones y respaldos.</p>
      </div>
      <button class="secundario" (click)="cargar()" [disabled]="cargando()">Actualizar</button>
    </header>
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    }
    @if (cargando()) {
      <p role="status">Consultando eventos…</p>
    }
    <section class="panel tabla">
      <table>
        <caption>
          Últimos 200 eventos
        </caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Actor</th>
            <th scope="col">Acción</th>
            <th scope="col">Empresa afectada</th>
            <th scope="col">Recurso</th>
          </tr>
        </thead>
        <tbody>
          @for (evento of eventos(); track evento.id) {
            <tr>
              <td>{{ evento.fecha | date: 'dd/MM/yyyy HH:mm' : '-0400' }}</td>
              <td>{{ evento.actor_id }}</td>
              <td>{{ evento.accion }}</td>
              <td>{{ evento.empresa_id ?? 'Plataforma' }}</td>
              <td class="codigo">{{ evento.recurso_id || '—' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5">No hay eventos disponibles.</td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
})
export class EventosPage {
  private readonly api = inject(SaasService);
  protected readonly eventos = signal<EventoPlataforma[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  constructor() {
    this.cargar();
  }
  protected cargar(): void {
    this.error.set('');
    this.cargando.set(true);
    this.api
      .eventos()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({ next: (e) => this.eventos.set(e), error: (e) => this.error.set(mensajeApi(e)) });
  }
}
