import { Directive, inject, input } from '@angular/core';
import { EstadoPlanService } from '../services/estado-plan.service';

@Directive({
  selector: 'button[appOperacionNueva]',
  host: { '[disabled]': 'appOperacionNueva() || !plan.operacionesPermitidas()' },
})
export class OperacionNuevaDirective {
  readonly appOperacionNueva = input(false);
  protected readonly plan = inject(EstadoPlanService);
}
