import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AsistenteProducto } from '../../models/asistente.models';
import { AsistenteService } from '../../services/asistente.service';

interface MensajeChat {
  autor: 'usuario' | 'asistente';
  texto: string;
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
  private readonly router = inject(Router);

  protected readonly abierto = signal(false);
  protected readonly cargando = signal(false);
  protected readonly texto = signal('');
  protected readonly mensajes = signal<MensajeChat[]>([
    {
      autor: 'asistente',
      texto: 'Hola, soy el asistente de StyleAR. Puedo ayudarte a buscar prendas, consultar stock o explicarte procesos como reservas, delivery, pagos, carrito y favoritos.',
    },
  ]);

  protected readonly puedeEnviar = computed(() => this.texto().trim().length > 0 && !this.cargando());

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
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
    if (!mensaje || this.cargando()) {
      return;
    }

    this.mensajes.update((actuales) => [...actuales, { autor: 'usuario', texto: mensaje }]);
    this.texto.set('');
    this.cargando.set(true);

    this.asistenteService
      .chat({
        mensaje,
        contexto: this.obtenerContexto(),
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (response) => {
          this.mensajes.update((actuales) => [
            ...actuales,
            {
              autor: 'asistente',
              texto: response.respuesta,
              productos: response.productos,
              alternativas: response.alternativas,
              acciones: response.acciones,
            },
          ]);
        },
        error: () => {
          this.mensajes.update((actuales) => [
            ...actuales,
            {
              autor: 'asistente',
              texto: 'No pude procesar tu consulta en este momento. Intenta nuevamente en unos segundos.',
            },
          ]);
        },
      });
  }

  protected enviarConEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  private obtenerContexto(): { producto_id?: number } | null {
    const match = this.router.url.match(/\/producto\/(\d+)/);
    if (!match) {
      return null;
    }

    return { producto_id: Number(match[1]) };
  }
}
