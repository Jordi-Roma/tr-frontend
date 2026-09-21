import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import * as L from 'leaflet';
import {
  CiudadResponse,
  SucursalResponse,
} from '../../models/ciudad-sucursal.models';
import { CiudadSucursalService } from '../../services/ciudad-sucursal.service';
import { AppModalComponent } from '../../../../shared/components/app-modal/app-modal.component';
import { DeliveryService } from '../../../ventas_inventario/services/delivery.service';

@Component({
  imports: [ReactiveFormsModule, AppModalComponent],
  selector: 'app-sucursales-page',
  styleUrl: './sucursales.page.css',
  templateUrl: './sucursales.page.html',
})
export class SucursalesPage {
  private readonly ciudadSucursalService = inject(CiudadSucursalService);
  private readonly deliveryService = inject(DeliveryService);

  @ViewChild('sucursalMap')
  set sucursalMapRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.sucursalMapElement = ref?.nativeElement;
    if (!ref) {
      this.destruirMapa();
      return;
    }
    if (this.sucursalMapElement && this.formularioAbierto()) {
      this.programarMapa();
    }
  }

  private sucursalMapElement?: HTMLDivElement;
  private sucursalMap?: L.Map;
  private sucursalMarker?: L.Marker;

  protected readonly sucursales = signal<SucursalResponse[]>([]);
  protected readonly ciudades = signal<CiudadResponse[]>([]);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly sucursalEditandoId = signal<number | null>(null);
  protected readonly formularioAbierto = signal(false);
  protected readonly mensaje = signal('');
  protected readonly error = signal('');

  protected readonly sucursalesFiltradas = computed(() => {
    const busqueda = this.busqueda().trim().toLowerCase();

    if (busqueda === '') {
      return this.sucursales();
    }

    return this.sucursales().filter((sucursal) => {
      const texto = [
        sucursal.nombre,
        sucursal.direccion,
        sucursal.telefono ?? '',
        sucursal.ciudad_nombre,
      ]
        .join(' ')
        .toLowerCase();

      return texto.includes(busqueda);
    });
  });

  protected readonly sucursalForm = new FormGroup({
    ciudadId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    direccion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    telefono: new FormControl<string | null>(null),
    latitud: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    longitud: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.cargarDatos();
  }

  protected actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  protected seleccionarSucursal(sucursal: SucursalResponse): void {
    this.sucursalEditandoId.set(sucursal.id);
    this.sucursalForm.setValue({
      ciudadId: sucursal.ciudad_id,
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      telefono: sucursal.telefono,
      latitud: this.toNumberOrNull(sucursal.latitud),
      longitud: this.toNumberOrNull(sucursal.longitud),
    });
    this.formularioAbierto.set(true);
    this.programarMapa();
    this.limpiarMensajes();
  }


  protected abrirNuevaSucursal(): void {
    this.cancelarEdicion();
    this.formularioAbierto.set(true);
    this.sucursalForm.patchValue({
      latitud: -17.783327,
      longitud: -63.18214,
    });
    this.programarMapa();
    this.limpiarMensajes();
  }

  protected cerrarFormulario(): void {
    this.cancelarEdicion();
    this.destruirMapa();
    this.formularioAbierto.set(false);
  }

  protected cancelarEdicion(): void {
    this.sucursalEditandoId.set(null);
    this.sucursalForm.reset();
  }

  protected buscarUbicacionSucursal(): void {
    const direccion = this.sucursalForm.controls.direccion.value.trim();
    if (direccion.length < 5) {
      this.error.set('Ingresa una dirección más completa para ubicar la sucursal.');
      return;
    }

    const ciudad = this.obtenerNombreCiudadSeleccionada();
    const consulta = ciudad && !direccion.toLowerCase().includes(ciudad.toLowerCase())
      ? `${direccion}, ${ciudad}, Bolivia`
      : `${direccion}, Bolivia`;

    this.procesando.set(true);
    this.limpiarMensajes();
    this.deliveryService
      .geocodificar(consulta)
      .pipe(finalize(() => this.procesando.set(false)))
      .subscribe({
        next: (resultado) => {
          this.sucursalForm.patchValue({
            direccion: resultado.direccion,
            latitud: this.toNumber(resultado.latitud),
            longitud: this.toNumber(resultado.longitud),
          });
          this.sincronizarMapa(this.toNumber(resultado.latitud), this.toNumber(resultado.longitud));
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  protected guardarSucursal(): void {
    this.limpiarMensajes();

    if (this.sucursalForm.invalid) {
      this.sucursalForm.markAllAsTouched();
      return;
    }

    const { ciudadId, nombre, direccion, telefono, latitud, longitud } =
      this.sucursalForm.getRawValue();

    if (ciudadId === null || latitud === null || longitud === null) {
      this.error.set('La ciudad y la ubicación en el mapa son obligatorias.');
      return;
    }

    this.procesando.set(true);
    const request = {
      ciudad_id: ciudadId,
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      telefono: this.limpiarTextoOpcional(telefono),
      latitud,
      longitud,
    };
    const sucursalId = this.sucursalEditandoId();
    const operacion =
      sucursalId === null
        ? this.ciudadSucursalService.crearSucursal(request)
        : this.ciudadSucursalService.actualizarSucursal(sucursalId, request);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: () => {
        this.mensaje.set(
          sucursalId === null
            ? 'Sucursal creada correctamente.'
            : 'Sucursal actualizada correctamente.'
        );
        this.cancelarEdicion();
        this.cargarSucursales();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  protected cambiarEstadoSucursal(sucursal: SucursalResponse): void {
    this.limpiarMensajes();
    this.procesando.set(true);
    const operacion = sucursal.activo
      ? this.ciudadSucursalService.desactivarSucursal(sucursal.id)
      : this.ciudadSucursalService.activarSucursal(sucursal.id);

    operacion.pipe(finalize(() => this.procesando.set(false))).subscribe({
      next: (response) => {
        this.mensaje.set(response.mensaje);
        this.cargarSucursales();
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarDatos(): void {
    this.cargarSucursales();
    this.ciudadSucursalService.listarCiudades().subscribe({
      next: (ciudades) => {
        this.ciudades.set(ciudades);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.obtenerMensajeError(error));
      },
    });
  }

  private cargarSucursales(): void {
    this.cargando.set(true);
    this.error.set('');

    this.ciudadSucursalService
      .listarSucursales()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (sucursales) => {
          this.sucursales.set(sucursales);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.obtenerMensajeError(error));
        },
      });
  }

  private limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }

  private limpiarTextoOpcional(valor: string | null): string | null {
    if (valor === null) {
      return null;
    }

    const limpio = valor.trim();
    return limpio === '' ? null : limpio;
  }

  private obtenerNombreCiudadSeleccionada(): string | null {
    const ciudadId = this.sucursalForm.controls.ciudadId.value;
    if (ciudadId === null) {
      return null;
    }
    return this.ciudades().find((ciudad) => Number(ciudad.id) === Number(ciudadId))?.nombre ?? null;
  }

  private programarMapa(): void {
    setTimeout(() => this.inicializarMapa(), 0);
  }

  private destruirMapa(): void {
    this.sucursalMap?.remove();
    this.sucursalMap = undefined;
    this.sucursalMarker = undefined;
  }

  private inicializarMapa(): void {
    const mapElement = this.sucursalMapElement;
    if (!mapElement) {
      return;
    }

    const latitud = this.sucursalForm.controls.latitud.value ?? -17.783327;
    const longitud = this.sucursalForm.controls.longitud.value ?? -63.18214;

    if (this.sucursalMap) {
      this.sucursalMap.invalidateSize();
      this.sincronizarMapa(latitud, longitud);
      return;
    }

    this.sucursalMap = L.map(mapElement, {
      center: [latitud, longitud],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.sucursalMap);

    this.sucursalMarker = L.marker([latitud, longitud], {
      draggable: true,
      icon: L.divIcon({
        className: 'branch-map-marker',
        html: '<span></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    }).addTo(this.sucursalMap);

    this.sucursalMarker.on('dragend', () => {
      const position = this.sucursalMarker?.getLatLng();
      if (!position) {
        return;
      }
      this.sucursalForm.patchValue({
        latitud: position.lat,
        longitud: position.lng,
      });
    });

    this.sucursalMap.on('click', (event: L.LeafletMouseEvent) => {
      this.sucursalForm.patchValue({
        latitud: event.latlng.lat,
        longitud: event.latlng.lng,
      });
      this.sincronizarMapa(event.latlng.lat, event.latlng.lng);
    });

    setTimeout(() => this.sucursalMap?.invalidateSize(), 150);
  }

  private sincronizarMapa(latitud: number, longitud: number): void {
    if (!this.sucursalMap || !this.sucursalMarker) {
      return;
    }
    this.sucursalMarker.setLatLng([latitud, longitud]);
    this.sucursalMap.setView([latitud, longitud], Math.max(this.sucursalMap.getZoom(), 14));
  }

  private toNumber(value: number | string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : -17.783327;
  }

  private toNumberOrNull(value: number | string | null): number | null {
    if (value === null) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    const detail = this.obtenerDetail(error.error);

    if (detail !== '') {
      return detail;
    }

    return 'No se pudo completar la operación. Intenta nuevamente.';
  }

  private obtenerDetail(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'detail' in error &&
      typeof error.detail === 'string'
    ) {
      return error.detail;
    }

    return '';
  }
}
