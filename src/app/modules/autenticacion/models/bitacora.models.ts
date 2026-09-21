export interface BitacoraItem {
  id: number;
  usuario_id: number | null;
  usuario_username: string | null;
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  accion: string;
  modulo: string;
  descripcion: string | null;
  resultado: string;
  direccion_ip: string | null;
  user_agent: string | null;
  fecha: string;
}

export interface BitacoraDetalle extends BitacoraItem {
  usuario_correo: string | null;
}

export interface BitacoraListResponse {
  registros: BitacoraItem[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

export interface BitacoraFiltros {
  usuario_id?: number | null;
  accion?: string;
  modulo?: string;
  resultado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina?: number;
  por_pagina?: number;
}
