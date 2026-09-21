export interface AsistenteContexto {
  producto_id?: number | null;
  sucursal_id?: number | null;
}

export interface AsistenteChatRequest {
  mensaje: string;
  contexto?: AsistenteContexto | null;
}

export interface AsistenteProducto {
  producto_id: number;
  nombre: string;
  categoria?: string | null;
  marca?: string | null;
  talla?: string | null;
  color?: string | null;
  sucursal?: string | null;
  ciudad?: string | null;
  stock_disponible?: number | null;
  stock_reservado?: number | null;
  stock_real?: number | null;
  precio_vigente?: number | null;
}

export interface AsistenteChatResponse {
  respuesta: string;
  tipo: string;
  productos: AsistenteProducto[];
  alternativas: AsistenteProducto[];
  acciones: Array<{
    tipo: string;
    label: string;
    url?: string | null;
  }>;
  filtros_detectados: Record<string, unknown>;
  requiere_login: boolean;
}
