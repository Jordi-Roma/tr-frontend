import {
  afterNextRender,
  Component,
  ElementRef,
  Injector,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { mensajeApi } from '../../../../core/services/error-api';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { Devolucion, VentaDevolucionElegible } from '../../models/devolucion.models';

interface Opcion {
  id: number;
  producto: string;
  talla: string;
  color: string;
  precio: string;
  disponible: number;
}
interface Cambio {
  id: number;
  version: number;
  estado: string;
  cantidad: number;
  credito: string | null;
  precio_reemplazo: string | null;
  diferencia: string | null;
  original: Devolucion;
  reemplazo?: { producto: string; talla: string; color: string };
  comprobante?: { codigo: string; credito: string; precio_reemplazo: string; diferencia: string };
  pago?: {
    id: number;
    proveedor: string;
    estado: string;
    monto_total: string;
    checkout_url: string | null;
    simulable: boolean;
  };
}
@Component({
  selector: 'app-cambios',
  imports: [RouterLink],
  templateUrl: './cambios.page.html',
  styleUrl: '../historial-pagos/devoluciones.page.css',
})
export class CambiosPage {
  private readonly injector = inject(Injector);
  private readonly detalle = viewChild<ElementRef<HTMLElement>>('detalle');
  private enfocar(): void {
    afterNextRender(() => this.detalle()?.nativeElement.focus(), { injector: this.injector });
  }
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = API_BASE_URL + '/api/v1/posventa/cambios';
  protected readonly personal =
    this.auth.tieneRol('ADMINISTRADOR') ||
    this.auth.tieneRol('ENCARGADO_SUCURSAL') ||
    this.auth.tieneRol('CAJERO');
  protected readonly gestion = signal(this.personal);
  protected readonly lista = signal<Cambio[]>([]);
  protected readonly ventas = signal<VentaDevolucionElegible[]>([]);
  protected readonly elegido = signal<Cambio | null>(null);
  protected readonly opciones = signal<Opcion[]>([]);
  protected readonly opcion = signal(0);
  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly ocupado = signal(false);
  protected readonly politica = signal<{
    cambios_habilitados: boolean;
    plazo_cambios: number | null;
    condiciones_cambios: string;
  } | null>(null);
  protected readonly solicitud = signal<{ venta: number; linea: number; max: number } | null>(null);
  protected readonly cantidad = signal(1);
  protected readonly motivo = signal('');
  protected readonly condicion = signal('');
  protected readonly noVendibles = signal(0);
  protected readonly recepcion = signal(false);
  protected readonly entrega = signal(false);
  protected readonly referencia = signal('');
  constructor() {
    this.cargar();
  }
  protected monto(v: string | number | null): string {
    return 'Bs ' + Number(v || 0).toFixed(2);
  }
  protected texto(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  protected marcado(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }
  protected cambiarVista(): void {
    this.gestion.update((v) => !v);
    this.elegido.set(null);
    this.cargar();
  }
  protected cargar(): void {
    this.http.get<Cambio[]>(this.base + '?gestion=' + this.gestion()).subscribe({
      next: (items) => {
        this.lista.set(items);
        const id = this.elegido()?.id;
        this.elegido.set(items.find((c) => c.id === id) || null);
      },
      error: (e: unknown) => {
        this.lista.set([]);
        this.elegido.set(null);
        this.error.set(mensajeApi(e));
      },
    });
    if (!this.gestion()) {
      this.http.get<VentaDevolucionElegible[]>(this.base + '/elegibles').subscribe({
        next: (v) => this.ventas.set(v),
        error: (e: unknown) => {
          this.ventas.set([]);
          this.error.set(mensajeApi(e));
        },
      });
      this.http
        .get<{
          cambios_habilitados: boolean;
          plazo_cambios: number | null;
          condiciones_cambios: string;
        }>(API_BASE_URL + '/api/v1/posventa/politica')
        .subscribe({
          next: (p) => this.politica.set(p),
          error: (e: unknown) => this.error.set(mensajeApi(e)),
        });
    }
  }
  protected iniciar(venta: number, linea: number, max: number): void {
    this.solicitud.set({ venta, linea, max });
    this.cantidad.set(1);
    this.motivo.set('');
  }
  protected solicitar(): void {
    const s = this.solicitud();
    if (!s || this.ocupado()) return;
    if (
      this.motivo().trim().length < 5 ||
      !Number.isInteger(this.cantidad()) ||
      this.cantidad() < 1 ||
      this.cantidad() > s.max
    ) {
      this.error.set('Indica motivo y cantidades elegibles.');
      return;
    }
    const body = {
      venta_id: s.venta,
      venta_detalle_id: s.linea,
      cantidad: this.cantidad(),
      motivo: this.motivo().trim(),
    };
    const espacio =
      'stylear_cambio:' +
      JSON.stringify({
        empresa: this.auth.usuarioActual()?.empresa_id,
        usuario: this.auth.usuarioActual()?.id,
        body,
      });
    let clave: string = crypto.randomUUID();
    try {
      clave = sessionStorage.getItem(espacio) || clave;
      sessionStorage.setItem(espacio, clave);
    } catch {
      /* Continuar sin almacenamiento local. */
    }
    this.ejecutar('', { ...body, clave_operacion: clave }, () => {
      this.solicitud.set(null);
      try {
        sessionStorage.removeItem(espacio);
      } catch {
        /* Sin copia local. */
      }
    });
  }
  protected abrir(c: Cambio): void {
    this.elegido.set(c);
    this.enfocar();
    this.opciones.set([]);
    this.opcion.set(0);
    this.condicion.set('');
    this.noVendibles.set(0);
    this.recepcion.set(false);
    this.entrega.set(false);
    this.referencia.set('');
  }
  protected revisar(aceptar: boolean): void {
    const c = this.elegido();
    if (!c) return;
    this.ejecutar(
      '/' + c.id + '/revision',
      {
        version: c.version,
        aceptar,
        no_vendibles: this.noVendibles(),
        condicion: this.condicion(),
        recepcion_confirmada: this.recepcion(),
      },
      undefined,
      'PATCH',
    );
  }
  protected cargarOpciones(): void {
    const c = this.elegido();
    if (!c) return;
    this.http.get<Opcion[]>(this.base + '/' + c.id + '/opciones').subscribe({
      next: (o) => {
        if (this.elegido()?.id !== c.id) return;
        this.opciones.set(o);
        this.opcion.set(o[0]?.id || 0);
        if (!o.length)
          this.aviso.set('No hay reemplazos suficientes. Puedes continuar por devolución.');
      },
      error: (e: unknown) => this.error.set(mensajeApi(e)),
    });
  }
  protected cotizar(): void {
    const c = this.elegido();
    if (c && this.opcion())
      this.ejecutar('/' + c.id + '/cotizar', { version: c.version, reemplazo_id: this.opcion() });
  }
  protected aceptar(): void {
    const c = this.elegido();
    if (c && window.confirm('¿Aceptas este reemplazo y la diferencia mostrada?'))
      this.ejecutar('/' + c.id + '/aceptar', { version: c.version, diferencia: c.diferencia });
  }
  protected accion(nombre: string): void {
    const c = this.elegido();
    if (c) this.ejecutar('/' + c.id + '/' + nombre, { version: c.version });
  }
  protected convertir(): void {
    if (window.confirm('¿Deseas continuar por devolución de la prenda original?'))
      this.accion('devolucion');
  }
  protected pagar(medio: string): void {
    const c = this.elegido();
    if (c) this.ejecutar('/' + c.id + '/pago', { version: c.version, medio });
  }
  protected simular(): void {
    const p = this.elegido()?.pago;
    if (!p?.simulable || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.http
      .post(
        API_BASE_URL +
          '/api/v1/pagos/' +
          (p.proveedor === 'STRIPE' ? 'stripe/confirmar-prueba/' : 'qr/confirmar/') +
          p.id,
        { aprobar: true },
      )
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: () => {
          this.aviso.set('Consulta el resultado del pago de prueba.');
          this.cargar();
        },
        error: (e: unknown) => this.error.set(mensajeApi(e)),
      });
  }
  protected reintegrar(efectivo: boolean): void {
    const c = this.elegido();
    if (c)
      this.ejecutar(
        '/' + c.id + (efectivo ? '/reintegro-efectivo' : '/reintegro'),
        efectivo ? { referencia: this.referencia() } : {},
      );
  }
  protected completar(): void {
    const c = this.elegido();
    if (c)
      this.ejecutar('/' + c.id + '/completar', {
        version: c.version,
        entrega_confirmada: this.entrega(),
      });
  }
  private ejecutar(ruta: string, body: object, despues?: () => void, method = 'POST'): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.aviso.set('');
    this.http
      .request<Cambio>(method, this.base + ruta, { body })
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (c) => {
          this.elegido.set(c);
          this.aviso.set('Operación registrada. Estado: ' + c.estado);
          this.entrega.set(false);
          despues?.();
          this.cargar();
        },
        error: (e: unknown) => this.error.set(mensajeApi(e)),
      });
  }
}
