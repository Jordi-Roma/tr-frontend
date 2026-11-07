import { Component, DestroyRef, effect, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { finalize } from 'rxjs';
import {
  AsistenteContexto,
  AsistenteChatResponse,
  AsistenteProducto,
  precioChat,
  destinoChat,
  datosChat,
  operacionChat,
} from '../../models/asistente.models';
import { AsistenteService } from '../../services/asistente.service';

interface MensajeChat {
  autor: 'usuario' | 'asistente';
  texto: string;
  respuesta?: AsistenteChatResponse;
  productos?: AsistenteProducto[];
  alternativas?: AsistenteProducto[];
  acciones?: Array<{
    tipo: string;
    label: string;
    url?: string | null;
  }>;
}

@Component({
  imports: [RouterLink],
  selector: 'app-asistente-chat',
  styleUrl: './asistente-chat.component.css',
  templateUrl: './asistente-chat.component.html',
})
export class AsistenteChatComponent {
  private readonly asistenteService = inject(AsistenteService);

  private readonly destroy = inject(DestroyRef);
  private readonly cambios = inject(CambioContextoService);
  private solicitud = 0;
  protected readonly contexto = signal<AsistenteContexto | null>(null);
  protected readonly error = signal('');
  protected readonly reintentarEn = signal(0);
  protected readonly precio = precioChat;
  protected readonly destino = destinoChat;
  protected readonly datos = datosChat;
  protected readonly operacion = operacionChat;
  constructor() {
    this.cambios.cambio$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.solicitud++;
      this.contexto.set(null);
      this.mensajes.set([]);
      this.texto.set('');
      this.error.set('');
      this.cargando.set(false);
      this.asistenteService.seleccion.set(null);
    });
    effect(() => {
      const s = this.asistenteService.seleccion();
      if (s) {
        this.solicitud++;
        this.cargando.set(false);
        this.contexto.set(s.contexto);
        this.abierto.set(true);
      }
    });
  }
  protected limpiar(): void {
    if (this.cargando()) return;
    this.contexto.set(null);
    this.mensajes.set([]);
    this.error.set('');
  }
  protected seleccionarProducto(p: AsistenteProducto): void {
    this.contexto.set({
      producto_id: p.producto_id,
      variante_id: p.variante_id,
      sucursal_id: p.sucursal_id,
    });
  }
  protected seleccionarOperacion(d: Record<string, unknown>): void {
    const c = operacionChat(d);
    if (c) this.contexto.set(c);
  }
  protected abrirOperacion(d: Record<string, unknown>): string | null {
    const o = operacionChat(d);
    if (!o) return null;
    const base =
      o.recurso_tipo === 'RESERVA'
        ? '/reservas/'
        : o.recurso_tipo === 'ORDEN_PAGO'
          ? '/mis-pagos/'
          : o.recurso_tipo === 'DELIVERY'
            ? '/mis-deliveries/'
            : null;
    return base ? base + o.recurso_id : null;
  }
  protected seleccion(): string {
    const c = this.contexto();
    return c?.recurso_tipo
      ? `${c.recurso_tipo.replaceAll('_', ' ')} #${c.recurso_id}`
      : c?.producto_id
        ? `Prenda #${c.producto_id}`
        : 'Sin selección';
  }
  protected readonly abierto = signal(false);
  protected readonly cargando = signal(false);
  protected readonly texto = signal('');
  protected readonly mensajes = signal<MensajeChat[]>([
    {
      autor: 'asistente',
      texto:
        'Hola, soy el asistente de StyleAR. Puedo ayudarte a buscar prendas, consultar stock o explicarte procesos como reservas, delivery, pagos, carrito y favoritos.',
    },
  ]);

  protected readonly puedeEnviar = computed(
    () => this.texto().trim().length > 0 && !this.cargando(),
  );

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
    setTimeout(() => {
      document.getElementById(this.abierto() ? 'chat-consulta' : 'chat-abrir')?.focus();
    }, 0);
  }

  protected actualizarTexto(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.texto.set(input.value);
  }

  protected usarPreguntaRapida(pregunta: string): void {
    this.texto.set(pregunta);
    this.enviar();
  }

  protected enviar(): void {
    const mensaje = this.texto().trim();
    if (!mensaje || mensaje.length > 600 || this.cargando() || Date.now() < this.reintentarEn()) {
      return;
    }

    this.mensajes.update((actuales) => [...actuales, { autor: 'usuario', texto: mensaje }]);
    this.texto.set('');
    this.cargando.set(true);
    this.error.set('');
    const generacion = this.cambios.generacion();
    const solicitud = ++this.solicitud;

    this.asistenteService
      .chat({
        mensaje,
        contexto: this.obtenerContexto(),
      })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generacion === this.cambios.generacion() && solicitud === this.solicitud)
            this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (generacion !== this.cambios.generacion() || solicitud !== this.solicitud) return;
          this.contexto.set(response.contexto ?? null);
          this.mensajes.update((actuales) => [
            ...actuales,
            {
              autor: 'asistente',
              texto: response.respuesta,
              respuesta: response,
              productos: response.productos,
              alternativas: response.alternativas,
              acciones: response.acciones,
            },
          ]);
        },
        error: (e: HttpErrorResponse) => {
          if (generacion !== this.cambios.generacion() || solicitud !== this.solicitud) return;
          if (e.status === 429) {
            const segundos = Math.max(1, Number(e.headers.get('Retry-After')) || 60);
            this.reintentarEn.set(Date.now() + segundos * 1000);
            this.error.set(`Espera ${segundos} segundos antes de enviar otra consulta.`);
          } else
            this.error.set(
              e.status === 401
                ? 'Tu sesión ya no es válida. Inicia sesión nuevamente.'
                : 'No se pudo consultar. Conservamos tu mensaje para que lo revises e intentes de nuevo.',
            );
          this.texto.set(mensaje);
        },
      });
  }

  protected enviarConEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  private obtenerContexto(): AsistenteContexto | null {
    return this.contexto();
  }
}
