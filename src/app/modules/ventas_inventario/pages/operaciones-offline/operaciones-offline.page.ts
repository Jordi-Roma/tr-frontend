import { Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { generarFrase } from '../../../../core/offline/offline.crypto';
import {
  LineaOffline,
  OperacionOffline,
  VarianteOffline,
} from '../../../../core/offline/offline.model';
import { OfflineService } from '../../../../core/offline/offline.service';

@Component({
  selector: 'app-operaciones-offline',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './operaciones-offline.page.html',
  styleUrl: './operaciones-offline.page.css',
})
export class OperacionesOfflinePage {
  protected readonly offline = inject(OfflineService);
  private readonly auth = inject(AuthService);
  protected readonly frase = new FormControl('', { nonNullable: true });
  protected readonly verFrase = signal(false);
  protected readonly sucursal = signal<number | null>(null);
  protected readonly seleccion = signal<LineaOffline[]>([]);
  protected readonly consulta = signal('');
  protected readonly limite = signal(60);
  protected readonly fechaCita = new FormControl('', { nonNullable: true });
  protected readonly efectivo = new FormControl(false, { nonNullable: true });
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly historialVisible = signal(false);
  protected readonly devolucion = signal<string | null>(null);
  private uuid?: string;
  private ambito?: string;

  protected readonly variantes = computed(() => {
    const items = this.offline.copia()?.catalogo[this.sucursal() ?? 0] ?? [];
    const consulta = this.consulta().trim().toLocaleLowerCase('es');
    return items.filter((v) =>
      `${v.nombre} ${v.talla ?? ''} ${v.color ?? ''}`.toLocaleLowerCase('es').includes(consulta),
    );
  });
  protected readonly cantidades = computed(
    () => new Map(this.seleccion().map((l) => [l.producto_variante_id, l.cantidad])),
  );
  protected readonly total = computed(() =>
    this.seleccion().reduce((suma, l) => suma + l.precio_centavos * l.cantidad, 0),
  );
  protected readonly colaVisible = computed(() => {
    const sucursales = new Set(this.offline.copia()?.sucursales.map((s) => s.id) ?? []);
    return this.offline.operaciones().filter((op) => !op.resultado || sucursales.has(op.sucursal));
  });
  protected readonly historial = computed(() => {
    const sincronizadas = new Set(
      this.colaVisible().flatMap((op) => (op.resultado ? [`${op.tipo}:${op.resultado.id}`] : [])),
    );
    return (this.offline.copia()?.historial ?? [])
      .filter((fila) => !sincronizadas.has(`${fila.tipo}:${fila.id}`))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  constructor() {
    effect(() => {
      const identidad = this.offline.identidad();
      const ambito = identidad && `${identidad.empresa}:${identidad.usuario}`;
      const sucursales = this.offline.copia()?.sucursales ?? [];
      if (ambito !== this.ambito) {
        this.ambito = ambito ?? undefined;
        this.reiniciar();
        this.frase.reset('');
        this.verFrase.set(false);
        this.devolucion.set(null);
        this.aviso.set('');
      }
      if (!sucursales.some((s) => s.id === this.sucursal())) {
        this.sucursal.set(sucursales[0]?.id ?? null);
        this.reiniciar();
      }
    });
  }

  protected generar(): void {
    this.frase.setValue(generarFrase());
    this.verFrase.set(true);
    this.aviso.set(
      'Guarda la frase en un lugar privado. La necesitarás para recuperar tus operaciones.',
    );
  }

  protected abrir(): void {
    this.verFrase.set(false);
    void this.accion(async () => {
      const frase = this.frase.value;
      if (this.offline.usuario()) await this.offline.habilitar(frase);
      else await this.offline.desbloquear(frase);
      this.frase.reset('');
      this.aviso.set('');
    });
  }

  protected cambiarSucursal(id: string): void {
    this.sucursal.set(Number(id));
    this.reiniciar();
    this.limite.set(60);
  }

  protected filtrar(texto: string): void {
    this.consulta.set(texto);
    this.limite.set(60);
  }

  protected verMas(): void {
    this.limite.update((limite) => limite + 60);
  }

  protected maximo(variante: VarianteOffline): number {
    return this.offline.puedeVender() ? variante.stock : Math.min(2, variante.stock);
  }

  protected cambiarCantidad(variante: VarianteOffline, cambio: number): void {
    if (this.guardando() || variante.precio_centavos === null) return;
    const anterior = this.seleccion().find((l) => l.producto_variante_id === variante.variante_id);
    const cantidad = (anterior?.cantidad ?? 0) + cambio;
    if (
      cantidad < 0 ||
      (cambio > 0 && cantidad > this.maximo(variante)) ||
      (!anterior && this.seleccion().length >= 100)
    )
      return;
    const lineas = this.seleccion().filter((l) => l.producto_variante_id !== variante.variante_id);
    if (cantidad > 0)
      lineas.push({
        producto_variante_id: variante.variante_id,
        cantidad,
        precio_centavos: anterior?.precio_centavos ?? variante.precio_centavos,
      });
    this.seleccion.set(lineas);
    this.efectivo.reset(false);
  }

  protected guardar(): void {
    const sucursal = this.sucursal();
    if (sucursal === null || !this.seleccion().length) return;
    const venta = this.offline.puedeVender();
    if (venta ? !this.efectivo.value : !this.fechaCita.value) return;
    void this.accion(async () => {
      const operacion: OperacionOffline = {
        uuid: (this.uuid ??= crypto.randomUUID()),
        tipo: venta ? 'VENTA' : 'RESERVA',
        sucursal,
        fecha: Date.now(),
        lineas: this.seleccion(),
        estado: 'Pendiente',
        ...(venta ? { efectivo: this.total() } : { fechaCita: this.fechaCita.value }),
      };
      await this.offline.registrar(operacion);
      this.reiniciar();
      this.aviso.set('Operación guardada. Puedes consultar su estado en el historial.');
      this.historialVisible.set(true);
    });
  }

  protected devolver(): void {
    const uuid = this.devolucion();
    if (uuid)
      void this.accion(async () => {
        await this.offline.registrarDevolucion(uuid);
        this.devolucion.set(null);
      });
  }

  protected salir(): void {
    void this.accion(async () => {
      await firstValueFrom(this.auth.logout());
      this.aviso.set(
        'Sesión cerrada. Las operaciones pendientes siguen guardadas para su titular.',
      );
    });
  }

  protected actualizar(): void {
    if (!this.seleccion().length && !this.guardando() && !this.offline.ocupada()) location.reload();
  }

  private reiniciar(): void {
    this.seleccion.set([]);
    this.fechaCita.reset('');
    this.efectivo.reset(false);
    this.uuid = undefined;
  }

  private async accion(operacion: () => Promise<void>): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      await operacion();
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo completar. Revisa la conexión.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
