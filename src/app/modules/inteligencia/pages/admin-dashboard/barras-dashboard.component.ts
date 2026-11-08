import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
export interface DatoGrafico {
  etiqueta: string;
  valor: number;
}
@Component({
  selector: 'app-barras-dashboard',
  imports: [DecimalPipe],
  template: `<article>
    <header>
      <span class="emblema" aria-hidden="true">▥</span>
      <div>
        <h3>{{ titulo() }}</h3>
        <p>{{ unidad() }} · escala desde cero</p>
      </div>
    </header>
    <div class="grafico" tabindex="0" role="region" [attr.aria-label]="titulo()">
      @if (datos().length) {
        @if (formato() === 'columnas') {
          <div class="columnas">
            @for (d of datos(); track $index) {
              <div class="columna" [style.--tono]="color($index)" [style.--claro]="claro($index)">
                <div class="poste">
                  <div class="relleno" [style.height.%]="maximo() ? (d.valor / maximo()) * 100 : 0">
                    <span class="valor">{{ d.valor | number: '1.0-2' }}</span>
                  </div>
                </div>
                <span class="nombre">{{ d.etiqueta }}</span>
              </div>
            }
          </div>
        } @else {
          <div class="ranking">
            @for (d of datos(); track $index) {
              <div class="fila" [style.--tono]="color($index)" [style.--claro]="claro($index)">
                <span class="puesto" aria-hidden="true">{{ $index + 1 }}</span>
                <div class="detalle">
                  <div class="etiqueta">
                    <span>{{ d.etiqueta }}</span
                    ><strong>{{ d.valor | number: '1.0-2' }}</strong>
                  </div>
                  <div class="pista" aria-hidden="true">
                    <span [style.width.%]="maximo() ? (d.valor / maximo()) * 100 : 0"></span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <div class="vacio">Sin movimientos en este período</div>
      }
    </div>
  </article>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    article {
      height: 100%;
      box-sizing: border-box;
      background: linear-gradient(145deg, #fff 50%, #edf3f6);
      border: 1px solid #d5dfe5;
      border-radius: 22px;
      padding: 1.4rem;
      color: #243849;
      box-shadow: 0 8px 24px #1d3a5510;
    }
    header {
      display: flex;
      gap: 0.8rem;
      align-items: start;
      margin-bottom: 1.4rem;
    }
    .emblema {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      border-radius: 13px;
      background: linear-gradient(135deg, #dce8f3, #e0eee4);
      color: #275779;
      font-size: 1.7rem;
    }
    h3 {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.4;
    }
    p {
      margin: 0.35rem 0 0;
      font-size: 0.85rem;
      color: #465d6c;
      line-height: 1.5;
    }
    .grafico {
      max-height: 335px;
      overflow: auto;
      padding: 8px 2px;
    }
    .columnas {
      display: flex;
      gap: 1.1rem;
      min-width: 100%;
      width: max-content;
      align-items: flex-start;
      background: repeating-linear-gradient(to top, transparent 0, transparent 49px, #dbe4e9 50px);
      background-size: 100% 200px;
      background-repeat: no-repeat;
      background-position: 0 8px;
    }
    .columna {
      flex: 1 0 64px;
      max-width: 150px;
      text-align: center;
      min-width: 64px;
    }
    .poste {
      height: 200px;
      position: relative;
      display: flex;
      align-items: end;
      justify-content: center;
      border-bottom: 2px solid #9aafbd;
    }
    .relleno {
      position: relative;
      width: 70%;
      max-width: 66px;
      min-width: 24px;
      border-radius: 10px 10px 0 0;
      background: linear-gradient(90deg, var(--tono), var(--claro) 65%, var(--tono));
      box-shadow:
        inset 0 3px 0 #ffffff80,
        5px 0 12px #1c3a5520;
    }
    .valor {
      position: absolute;
      bottom: calc(100% + 5px);
      left: 50%;
      transform: translateX(-50%);
      padding: 3px 8px;
      border-radius: 8px;
      background: #f0f5f8;
      color: #243849;
      font-size: 0.85rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .poste {
      margin-top: 24px;
    }
    .nombre {
      display: block;
      font-size: 0.8rem;
      line-height: 1.4;
      margin-top: 0.8rem;
      max-width: 140px;
      overflow-wrap: anywhere;
    }
    .ranking {
      display: grid;
      gap: 1.1rem;
    }
    .fila {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }
    .puesto {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      border-radius: 10px;
      background: #e5edf3;
      color: #294c66;
      font-weight: 800;
    }
    .detalle {
      flex: 1;
      min-width: 0;
    }
    .etiqueta {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.88rem;
      line-height: 1.5;
      margin-bottom: 0.5rem;
    }
    .etiqueta span {
      overflow-wrap: anywhere;
    }
    .etiqueta strong {
      background: #e8f0f5;
      border-radius: 8px;
      padding: 0 0.6rem;
      align-self: start;
      color: #294c66;
    }
    .pista {
      height: 28px;
      border-radius: 9px;
      background: #e4ebf0;
      box-shadow: inset 0 2px 4px #23425a10;
      overflow: hidden;
    }
    .pista span {
      display: block;
      height: 100%;
      border-radius: 9px;
      background:
        repeating-linear-gradient(90deg, transparent 0 25px, #ffffff30 25px 27px),
        linear-gradient(90deg, var(--tono), var(--claro));
      box-shadow: inset 0 3px 0 #ffffff50;
    }
    .vacio {
      padding: 3rem 1rem;
      text-align: center;
      color: #465d6c;
      background: #f0f5f8;
      border-radius: 14px;
    }
    :focus-visible {
      outline: 3px solid #245a81;
      outline-offset: 3px;
    }
  `,
})
export class BarrasDashboardComponent {
  readonly titulo = input.required<string>();
  readonly unidad = input.required<string>();
  readonly datos = input.required<DatoGrafico[]>();
  readonly formato = input<'columnas' | 'ranking'>('columnas');
  readonly maximo = computed(() => Math.max(0, ...this.datos().map((d) => d.valor)));
  protected color(i: number): string {
    return ['#225d89', '#316d5d', '#79518c', '#a25230'][i % 4];
  }
  protected claro(i: number): string {
    return ['#5c9cc2', '#73ad91', '#ae88bd', '#d99865'][i % 4];
  }
}
