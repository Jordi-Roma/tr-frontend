import {
  BandejaNotificaciones,
  CategoriaNotificacion,
  PreferenciasNotificaciones,
  DestinoNotificacion,
  EstadoNotificacion,
} from '../models/pago.models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../../autenticacion/services/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  ConfiguracionPagosEmpresa,
  ReembolsoPago,
  NotificacionPropia,
  CheckoutQrResponse,
  CheckoutStripeResponse,
  ConfirmarPagoPruebaRequest,
  CrearCheckoutQrRequest,
  CrearCheckoutStripeRequest,
  OrdenPagoResponse,
  PagoFiltros,
  PagoHistorialDetalle,
  PagoHistorialItem,
} from '../models/pago.models';

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly auth = inject(AuthService);
  private readonly claves = new Map<string, { huella: string; clave: string }>();
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_BASE_URL}/api/v1/pagos`;

  crearCheckoutStripe(request: CrearCheckoutStripeRequest): Observable<CheckoutStripeResponse> {
    return this.http.post<CheckoutStripeResponse>(
      `${this.apiUrl}/stripe/checkout`,
      this.conClave(request, 'stripe'),
    );
  }

  crearCheckoutQr(request: CrearCheckoutQrRequest): Observable<CheckoutQrResponse> {
    return this.http.post<CheckoutQrResponse>(
      `${this.apiUrl}/qr/checkout`,
      this.conClave(request, 'qr'),
    );
  }

  confirmarPagoQr(ordenId: number): Observable<OrdenPagoResponse> {
    return this.http
      .post<OrdenPagoResponse>(`${this.apiUrl}/qr/confirmar/${ordenId}`, {})
      .pipe(tap((o) => this.finalizarClave(o)));
  }

  obtenerOrden(ordenId: number): Observable<OrdenPagoResponse> {
    return this.http
      .get<OrdenPagoResponse>(`${this.apiUrl}/orden/${ordenId}`)
      .pipe(tap((o) => this.finalizarClave(o)));
  }

  confirmarPrueba(
    ordenId: number,
    request: ConfirmarPagoPruebaRequest,
  ): Observable<OrdenPagoResponse> {
    return this.http
      .post<OrdenPagoResponse>(`${this.apiUrl}/stripe/confirmar-prueba/${ordenId}`, request)
      .pipe(tap((o) => this.finalizarClave(o)));
  }

  listarMisPagos(filtros: PagoFiltros = {}): Observable<PagoHistorialItem[]> {
    return this.http.get<PagoHistorialItem[]>(`${this.apiUrl}/mis-pagos`, {
      params: this.crearParams(filtros),
    });
  }

  obtenerMiPago(ordenId: number): Observable<PagoHistorialDetalle> {
    return this.http.get<PagoHistorialDetalle>(`${this.apiUrl}/mis-pagos/${ordenId}`);
  }

  listarPagos(filtros: PagoFiltros = {}): Observable<PagoHistorialItem[]> {
    return this.http.get<PagoHistorialItem[]>(this.apiUrl, {
      params: this.crearParams(filtros),
    });
  }

  obtenerPago(ordenId: number): Observable<PagoHistorialDetalle> {
    return this.http.get<PagoHistorialDetalle>(`${this.apiUrl}/${ordenId}`);
  }

  private espacio(metodo: string): string {
    const u = this.auth.usuarioActual();
    return `stylear-checkout:${u?.empresa_id}:${u?.id}:${metodo}`;
  }
  private conClave<T extends CrearCheckoutStripeRequest>(request: T, metodo: string): T {
    const espacio = this.espacio(metodo);
    const huella = JSON.stringify(request);
    let previo = this.claves.get(espacio);
    try {
      const guardado: unknown = JSON.parse(sessionStorage.getItem(espacio) || 'null');
      if (
        typeof guardado === 'object' &&
        guardado !== null &&
        'huella' in guardado &&
        typeof guardado.huella === 'string' &&
        'clave' in guardado &&
        typeof guardado.clave === 'string'
      )
        previo = { huella: guardado.huella, clave: guardado.clave };
    } catch {
      /* Conserva el identificador en memoria si el almacenamiento no está disponible. */
    }
    const actual = previo?.huella === huella ? previo : { huella, clave: crypto.randomUUID() };
    this.claves.set(espacio, actual);
    try {
      sessionStorage.setItem(espacio, JSON.stringify(actual));
    } catch {
      /* La API conserva el intento pendiente. */
    }
    return { ...request, clave_operacion: request.clave_operacion || actual.clave };
  }
  private finalizarClave(o: OrdenPagoResponse): void {
    if (o.estado === 'PENDIENTE') return;
    const espacio = this.espacio(o.proveedor === 'STRIPE' ? 'stripe' : 'qr');
    this.claves.delete(espacio);
    try {
      sessionStorage.removeItem(espacio);
    } catch {
      /* No hay datos sensibles en estas claves. */
    }
  }
  obtenerPendiente(): Observable<OrdenPagoResponse | null> {
    return this.http.get<OrdenPagoResponse | null>(
      API_BASE_URL + '/api/v1/pagos-empresa/pendiente',
    );
  }
  cancelarIntento(id: number): Observable<OrdenPagoResponse> {
    return this.http
      .post<OrdenPagoResponse>(API_BASE_URL + `/api/v1/pagos-empresa/ordenes/${id}/cancelar`, {})
      .pipe(tap((o) => this.finalizarClave(o)));
  }
  configuracion(): Observable<ConfiguracionPagosEmpresa> {
    return this.http.get<ConfiguracionPagosEmpresa>(
      API_BASE_URL + '/api/v1/pagos-empresa/configuracion',
    );
  }
  guardarConfiguracion(datos: {
    version: number;
    titular: string;
    stripe_habilitado: boolean;
    qr_habilitado: boolean;
  }): Observable<ConfiguracionPagosEmpresa> {
    return this.http.put<ConfiguracionPagosEmpresa>(
      API_BASE_URL + '/api/v1/pagos-empresa/configuracion',
      datos,
    );
  }
  reembolsos(): Observable<ReembolsoPago[]> {
    return this.http.get<ReembolsoPago[]>(API_BASE_URL + '/api/v1/pagos-empresa/reembolsos');
  }
  simularReembolso(id: number): Observable<ReembolsoPago> {
    return this.http.post<ReembolsoPago>(
      API_BASE_URL + `/api/v1/pagos-empresa/reembolsos/${id}/simular`,
      { aprobar: true },
    );
  }
  reintentarReembolso(id: number): Observable<unknown> {
    return this.http.post(API_BASE_URL + `/api/v1/pagos-empresa/reembolsos/${id}/reintentar`, {});
  }
  notificaciones(): Observable<NotificacionPropia[]> {
    return this.http.get<NotificacionPropia[]>(API_BASE_URL + '/api/v1/notificaciones');
  }
  leerNotificacion(id: number): Observable<unknown> {
    return this.http.patch(API_BASE_URL + `/api/v1/notificaciones/${id}/leer`, {});
  }

  bandejaNotificaciones(
    pagina = 1,
    leida: boolean | null = null,
    categoria: CategoriaNotificacion | null = null,
  ) {
    return this.http.get<BandejaNotificaciones>(API_BASE_URL + '/api/v1/notificaciones/bandeja', {
      params: new HttpParams({
        fromObject: {
          pagina,
          tamano: 20,
          ...(leida === null ? {} : { leida }),
          ...(categoria === null ? {} : { categoria }),
        },
      }),
    });
  }
  resumenNotificaciones() {
    return this.http.get<{ total: number; no_leidas: number }>(
      API_BASE_URL + '/api/v1/notificaciones/resumen',
    );
  }
  leerTodasNotificaciones() {
    return this.http.patch<{ actualizadas: number }>(
      API_BASE_URL + '/api/v1/notificaciones/leer-todas',
      {},
    );
  }
  preferenciasNotificaciones() {
    return this.http.get<PreferenciasNotificaciones>(
      API_BASE_URL + '/api/v1/notificaciones/preferencias',
    );
  }
  guardarPreferenciasNotificaciones(categorias: Partial<Record<CategoriaNotificacion, boolean>>) {
    return this.http.put<PreferenciasNotificaciones>(
      API_BASE_URL + '/api/v1/notificaciones/preferencias',
      { categorias },
    );
  }
  destinoNotificacion(id: number) {
    return this.http.get<DestinoNotificacion>(
      API_BASE_URL + `/api/v1/notificaciones/${id}/destino`,
    );
  }
  estadoNotificacion(id: number) {
    return this.http.get<EstadoNotificacion>(API_BASE_URL + `/api/v1/notificaciones/${id}/estado`);
  }
  private crearParams(filtros: PagoFiltros): HttpParams {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    });
    return params;
  }
}
