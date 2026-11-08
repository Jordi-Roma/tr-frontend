import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { AnaliticaPage } from './analitica.page';
import { AnaliticaService } from '../../services/analitica.service';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import {
  EstadoAnalitica,
  PrediccionesAnalitica,
  SegmentosAnalitica,
} from '../../models/analitica.models';

const estado: EstadoAnalitica = {
  alcance: 'EMPRESA',
  segmentacion_permitida: true,
  fuentes: (['OFICIAL', 'DEMOSTRACION'] as const).map((origen) => ({
    origen,
    estado: origen === 'OFICIAL' ? 'HISTORIAL_INSUFICIENTE' : 'DISPONIBLE',
    advertencia:
      origen === 'OFICIAL'
        ? 'No hay modelo oficial validado.'
        : 'Demostración con datos sintéticos.',
    evaluado_en: null,
    fuente_datos: null,
    sucursales: [{ id: 1, nombre: 'Centro', datos_disponibles: true }],
  })),
};
const oficial: PrediccionesAnalitica = {
  origen: 'OFICIAL',
  estado: 'HISTORIAL_INSUFICIENTE',
  advertencia: '',
  pagina: 1,
  tamano: 25,
  total_filas: 0,
  sin_datos: true,
  metricas: null,
  filas: [],
  serie: [],
  productos: [],
};
const demo: PrediccionesAnalitica = {
  ...oficial,
  origen: 'DEMOSTRACION',
  estado: 'DISPONIBLE',
  advertencia: 'Datos sintéticos',
  total_filas: 75,
  sin_datos: false,
  metricas: { muestras: 75, mae: 4.47, rmse: 5.78, mae_referencia: 5.56 },
  productos: ['SYN-P01'],
  serie: [
    {
      fecha_corte: '2026-01-01',
      unidades_reales: 10,
      unidades_predichas: 8,
      referencia_semana_anterior: 7,
    },
  ],
  filas: [
    {
      fecha_corte: '2026-01-01',
      objetivo_hasta: '2026-01-08',
      sucursal_id: 1,
      sucursal: 'Centro',
      producto_id: 'SYN-P01',
      unidades_reales: 10,
      unidades_predichas: 8,
      referencia_semana_anterior: 7,
    },
  ],
};
const segmentos: SegmentosAnalitica = {
  ...oficial,
  origen: 'DEMOSTRACION',
  estado: 'DISPONIBLE',
  filas: [],
  perfiles: [],
  metricas: null,
};

describe('Dashboard de analítica ML', () => {
  const predicciones = vi.fn();
  const consultarSegmentos = vi.fn();
  const exportar = vi.fn();
  beforeEach(() => {
    predicciones
      .mockReset()
      .mockImplementation((f) =>
        of({ ...(f.origen === 'OFICIAL' ? oficial : demo), pagina: f.pagina }),
      );
    consultarSegmentos.mockReset().mockReturnValue(of(segmentos));
    exportar.mockReset().mockReturnValue(of(new Blob(['reporte'])));
    TestBed.configureTestingModule({
      imports: [AnaliticaPage],
      providers: [
        CambioContextoService,
        {
          provide: AnaliticaService,
          useValue: { estado: () => of(estado), predicciones, segmentos: consultarSegmentos, exportar },
        },
      ],
    });
  });
  it('comienza en oficial sin mostrar la demostración como pronóstico vigente', () => {
    const f = TestBed.createComponent(AnaliticaPage);
    f.detectChanges();
    expect(predicciones).toHaveBeenCalledWith({ origen: 'OFICIAL', pagina: 1, tamano: 25 });
    expect(f.nativeElement.textContent).toContain('Historial insuficiente');
    expect(f.nativeElement.querySelector('svg')).toBeNull();
    f.componentInstance['form'].controls.origen.setValue('DEMOSTRACION');
    f.detectChanges();
    expect(f.nativeElement.querySelector('svg[role="img"]')).not.toBeNull();
    expect(f.nativeElement.textContent).toContain('No es un pronóstico oficial vigente');
    expect(f.nativeElement.textContent).toContain(
      'Métricas y gráfico corresponden a todo el filtro aplicado',
    );
  });
  it('descarta respuestas del origen anterior y limpia los datos al cambiar sesión', () => {
    const pendiente = new Subject<PrediccionesAnalitica>();
    predicciones.mockImplementation((f) => (f.origen === 'DEMOSTRACION' ? pendiente : of(oficial)));
    const f = TestBed.createComponent(AnaliticaPage);
    f.detectChanges();
    const c = f.componentInstance;
    c['form'].controls.origen.setValue('DEMOSTRACION');
    c['form'].controls.origen.setValue('OFICIAL');
    pendiente.next(demo);
    f.detectChanges();
    expect(c['prediccion']()?.origen).toBe('OFICIAL');
    TestBed.inject(CambioContextoService).invalidar();
    f.detectChanges();
    expect(c['estado']()).toBeNull();
    expect(c['prediccion']()).toBeNull();
    expect(f.nativeElement.textContent).toContain('La sesión cambió');
  });
  it('pagina con los filtros aplicados aunque se editen fechas sin consultar', () => {
    const f = TestBed.createComponent(AnaliticaPage);
    const c = f.componentInstance;
    c['form'].controls.origen.setValue('DEMOSTRACION');
    c['form'].patchValue({ desde: '2026-01-01', sucursal: 1 });
    c['consultar']();
    c['form'].patchValue({ desde: '2025-01-01', sucursal: 0 });
    c['pagina'](1);
    expect(predicciones).toHaveBeenLastCalledWith({
      origen: 'DEMOSTRACION',
      pagina: 2,
      tamano: 25,
      sucursal_id: 1,
      corte_desde: '2026-01-01',
    });
  });
  it('no ofrece segmentación al encargado ni consulta ese endpoint', () => {
    TestBed.overrideProvider(AnaliticaService, {
      useValue: {
        estado: () => of({ ...estado, segmentacion_permitida: false }),
        predicciones,
        segmentos: consultarSegmentos,
        exportar,
      },
    });
    const f = TestBed.createComponent(AnaliticaPage);
    f.detectChanges();
    expect(f.nativeElement.querySelector('option[value="segmentos"]')).toBeNull();
    f.componentInstance['form'].controls.vista.setValue('segmentos');
    expect(consultarSegmentos).not.toHaveBeenCalled();
  });
  it('muestra errores y permite reintentar sin conservar gráficos anteriores', () => {
    const f = TestBed.createComponent(AnaliticaPage);
    f.componentInstance['form'].controls.origen.setValue('DEMOSTRACION');
    f.detectChanges();
    predicciones.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({ status: 503, error: { detail: 'Resultados no disponibles.' } }),
      ),
    );
    f.componentInstance['consultar']();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Resultados no disponibles.',
    );
    expect(f.nativeElement.querySelector('svg')).toBeNull();
    f.componentInstance['consultar']();
    f.detectChanges();
    expect(f.nativeElement.querySelector('svg')).not.toBeNull();
  });
  it('exporta filtros aplicados completos y omite página y tamaño', async () => {
    const crearOriginal = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revocarOriginal = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const crear = vi.fn(() => 'blob:reporte');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: crear });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    try {
      const f = TestBed.createComponent(AnaliticaPage),
        c = f.componentInstance;
      c['form'].controls.origen.setValue('DEMOSTRACION');
      c['form'].patchValue({ sucursal: 1, desde: '2026-01-01' });
      c['consultar']();
      c['form'].patchValue({ sucursal: 0, desde: '2025-01-01' });
      c['exportar']('pdf');
      expect(exportar).toHaveBeenCalledWith(
        { tipo: 'PREDICCIONES', origen: 'DEMOSTRACION', sucursal_id: 1, corte_desde: '2026-01-01' },
        'pdf',
      );
      expect(crear).toHaveBeenCalledOnce();
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toContain('demostracion.pdf');
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      click.mockRestore();
      if (crearOriginal) Object.defineProperty(URL, 'createObjectURL', crearOriginal);
      else Reflect.deleteProperty(URL, 'createObjectURL');
      if (revocarOriginal) Object.defineProperty(URL, 'revokeObjectURL', revocarOriginal);
      else Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });
});
