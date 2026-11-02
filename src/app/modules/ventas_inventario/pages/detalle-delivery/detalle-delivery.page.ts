import { mensajeApi } from '../../../../core/services/error-api';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../autenticacion/services/auth.service';
import { DeliveryDetalle } from '../../models/delivery.models';
import { DeliveryService } from '../../services/delivery.service';

@Component({
  imports: [RouterLink],
  selector: 'app-detalle-delivery-page',
  styleUrl: './detalle-delivery.page.css',
  templateUrl: './detalle-delivery.page.html',
})
export class DetalleDeliveryPage implements OnInit {
  private readonly deliveryService = inject(DeliveryService);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly delivery = signal<DeliveryDetalle | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly nuevoEstado = signal('');
  protected readonly observacion = signal('');
  protected readonly recepcion=signal(false);
  protected aceptarRecepcion(event:Event):void {this.recepcion.set((event.target as HTMLInputElement).checked);}
  protected readonly rutaPuntos=computed(()=>{
    const ruta=this.delivery()?.ruta||[];if(!ruta.length)return '';
    const xs=ruta.map(p=>p[0]),ys=ruta.map(p=>p[1]),xmin=Math.min(...xs),ymin=Math.min(...ys);
    const escala=Math.min(560/Math.max(...xs.map(x=>x-xmin),.0000001),200/Math.max(...ys.map(y=>y-ymin),.0000001));
    return ruta.map(p=>`${20+(p[0]-xmin)*escala},${220-(p[1]-ymin)*escala}`).join(' ');
  });
  protected incidencia(resolver:boolean):void {
    const item=this.delivery(),obs=this.observacion().trim();if(!item||this.guardando()||obs.length<5)return;
    this.guardando.set(true);this.error.set('');
    this.deliveryService.incidencia(item.id,{version:item.version,resolver,observacion:obs}).pipe(finalize(()=>this.guardando.set(false))).subscribe({next:r=>{this.delivery.set(r.delivery);this.nuevoEstado.set(r.delivery.estado);this.observacion.set('');this.mensaje.set(r.mensaje);},error:(e:unknown)=>this.error.set(mensajeApi(e))});
  }
  protected readonly vistaCliente = computed(() => this.authService.tieneRol('CLIENTE'));
  protected readonly mapaUrl = computed<SafeResourceUrl>(() => {
    const item = this.delivery();
    const lat = Number(item?.latitud_entrega ?? -17.783327);
    const lng = Number(item?.longitud_entrega ?? -63.18214);
    const delta = 0.02;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id)) {
      this.error.set('Delivery no valido.');
      return;
    }
    this.cargando.set(true);
    this.delivery.set(null);
    this.error.set('');
    const request = this.vistaCliente()
      ? this.deliveryService.obtenerMiDelivery(id)
      : this.deliveryService.obtenerDelivery(id);
    request.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (delivery) => {
        this.delivery.set(delivery);
        this.nuevoEstado.set(delivery.estado);
      },
      error: (error: HttpErrorResponse) => this.error.set(mensajeApi(error)),
    });
  }

  protected actualizarEstado(event: Event): void {
    this.nuevoEstado.set((event.target as HTMLSelectElement).value);
  }

  protected actualizarObservacion(event: Event): void {
    this.observacion.set((event.target as HTMLTextAreaElement).value);
  }

  protected guardarEstado(): void {
    const item = this.delivery();
    if (!item) return;
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.deliveryService
      .actualizarEstado(item.id, {
        version:item.version,
        recepcion_confirmada:this.recepcion(),
        estado: this.nuevoEstado(),
        observacion: this.observacion().trim() || null,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (response) => {
          this.delivery.set(response.delivery);this.nuevoEstado.set(response.delivery.estado);this.recepcion.set(false);this.observacion.set('');
          this.mensaje.set(response.mensaje);
        },
        error: (error: HttpErrorResponse) => this.error.set(mensajeApi(error)),
      });
  }

  protected formatPrecio(value: number | string | null | undefined): string {
    const number = Number(value ?? 0);
    return `Bs ${Number.isFinite(number) ? number.toFixed(2) : '0.00'}`;
  }

  protected formatFecha(value: string | null | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-BO');
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'detail' in error.error) {
      const detail = error.error.detail;
      if (typeof detail === 'string') return detail;
    }
    return 'No se pudo procesar el delivery.';
  }
}
