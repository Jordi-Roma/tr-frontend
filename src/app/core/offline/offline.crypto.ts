import { CuentaOffline, Sobre } from './offline.model';

const ITERACIONES = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function derivar(frase: string, sal: Uint8Array<ArrayBuffer>, iteraciones: number) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(frase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function cifrar(clave: CryptoKey, etiqueta: string, texto: BufferSource): Promise<Sobre> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(etiqueta) },
    clave,
    texto,
  );
  return { iv, datos };
}

function descifrar(clave: CryptoKey, etiqueta: string, sobre: Sobre): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: sobre.iv, additionalData: encoder.encode(etiqueta) },
    clave,
    sobre.datos,
  );
}

export async function crearCuenta(ambito: string, frase: string): Promise<CuentaOffline> {
  if (frase.trim().length < 16)
    throw new Error('Usa una frase de acceso de al menos 16 caracteres.');
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const material = crypto.getRandomValues(new Uint8Array(32));
  const envoltura = await derivar(frase, sal, ITERACIONES);
  try {
    return {
      ambito,
      sal,
      iteraciones: ITERACIONES,
      clave: await cifrar(envoltura, `clave:${ambito}`, material),
    };
  } finally {
    material.fill(0);
  }
}

export async function abrirCuenta(cuenta: CuentaOffline, frase: string): Promise<CryptoKey> {
  const envoltura = await derivar(frase, cuenta.sal, cuenta.iteraciones);
  const material = await descifrar(envoltura, `clave:${cuenta.ambito}`, cuenta.clave);
  try {
    return await crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
  } finally {
    new Uint8Array(material).fill(0);
  }
}

export function sellar<T>(clave: CryptoKey, etiqueta: string, valor: T): Promise<Sobre> {
  return cifrar(clave, etiqueta, encoder.encode(JSON.stringify(valor)));
}

export async function abrir<T>(clave: CryptoKey, etiqueta: string, sobre: Sobre): Promise<T> {
  return JSON.parse(decoder.decode(await descifrar(clave, etiqueta, sobre))) as T;
}

export function generarFrase(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(15)), (b) =>
    b.toString(16).padStart(2, '0'),
  )
    .join('')
    .match(/.{6}/g)!
    .join('-');
}
