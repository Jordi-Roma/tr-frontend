import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { SolicitudAnaliticaComponent } from './solicitud-analitica.component';
import { AnaliticaService } from '../../services/analitica.service';
import { CambioContextoService } from '../../../../core/services/cambio-contexto.service';
import { InterpretacionAnalitica } from '../../models/analitica.models';

const respuesta: InterpretacionAnalitica = {
  motor: 'REGLAS_ANALITICA',
  requiere_aclaracion: false,
  mensaje: 'Revisa los filtros.',
  formato_sugerido: 'PDF',
  solicitud: { tipo: 'PREDICCIONES', origen: 'DEMOSTRACION', sucursal_id: 1 },
};
describe('Solicitud natural de analítica', () => {
  const interpretar = vi.fn();
  beforeEach(() => {
    interpretar.mockReset().mockReturnValue(of(respuesta));
    TestBed.configureTestingModule({
      imports: [SolicitudAnaliticaComponent],
      providers: [CambioContextoService, { provide: AnaliticaService, useValue: { interpretar } }],
    });
  });
  function crear() {
    const f = TestBed.createComponent(SolicitudAnaliticaComponent);
    f.componentRef.setInput('origen', 'OFICIAL');
    f.detectChanges();
    return f;
  }
  it('requiere revisión y aplicación explícita antes de cambiar el reporte', () => {
    const f = crear(),
      c = f.componentInstance,
      aplicar = vi.fn();
    c.aplicar.subscribe(aplicar);
    c['texto'].setValue('Muéstrame evaluación de predicciones sintéticas en PDF');
    c['interpretar']();
    f.detectChanges();
    expect(interpretar).toHaveBeenCalledWith(c['texto'].value, 'OFICIAL', 'TEXTO');
    expect(aplicar).not.toHaveBeenCalled();
    const botones = Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    botones.find((b) => b.textContent?.includes('Aplicar solicitud revisada'))!.click();
    expect(aplicar).toHaveBeenCalledWith(respuesta.solicitud);
  });
  it('la aclaración no presenta filtros ni botón de aplicación', () => {
    interpretar.mockReturnValue(
      of({
        ...respuesta,
        requiere_aclaracion: true,
        solicitud: null,
        mensaje: 'Indica la sucursal.',
      }),
    );
    const f = crear();
    f.componentInstance['texto'].setValue('Predicciones de mi sucursal');
    f.componentInstance['interpretar']();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Indica la sucursal.');
    expect(f.nativeElement.textContent).not.toContain('Aplicar solicitud revisada');
  });
  it('descarta propuesta tardía al editar y elimina el texto al cambiar sesión', () => {
    const pendiente = new Subject<InterpretacionAnalitica>();
    interpretar.mockReturnValue(pendiente);
    const f = crear(),
      c = f.componentInstance;
    c['texto'].setValue('Predicciones sintéticas');
    c['interpretar']();
    c['texto'].setValue('Otra solicitud');
    pendiente.next(respuesta);
    f.detectChanges();
    expect(c['preview']()).toBeNull();
    TestBed.inject(CambioContextoService).invalidar();
    f.detectChanges();
    expect(c['texto'].value).toBe('');
    expect(c['preview']()).toBeNull();
  });
  it('el dictado descartado no introduce texto de otro origen', () => {
    class Motor {
      lang = '';
      interimResults = false;
      onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start() {}
      stop() {}
    }
    let motor: Motor | undefined;
    class Fabrica extends Motor {
      constructor() {
        super();
        motor = this;
      }
    }
    const anterior = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition');
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: Fabrica });
    try {
      const f = crear(),
        c = f.componentInstance;
      c['dictar']();
      const callback = motor!.onresult!;
      f.componentRef.setInput('origen', 'DEMOSTRACION');
      f.detectChanges();
      callback({ results: [[{ transcript: 'Texto tardío' }]] });
      expect(c['texto'].value).toBe('');
      c['dictar']();
      motor!.onresult!({ results: [[{ transcript: 'Evaluación de predicciones' }]] });
      c['interpretar']();
      expect(interpretar).toHaveBeenLastCalledWith(
        'Evaluación de predicciones',
        'DEMOSTRACION',
        'VOZ',
      );
    } finally {
      if (anterior) Object.defineProperty(window, 'SpeechRecognition', anterior);
      else Reflect.deleteProperty(window, 'SpeechRecognition');
    }
  });
});
