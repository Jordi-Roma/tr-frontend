"""Starts the API on an explicitly supplied disposable localhost test database.

Never reads a production destination from .env. The frontend tests rewrite only
the API port to 18127; their payloads are served by the real FastAPI backend.
"""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from uuid import uuid4
import re
import socket
import time
from threading import Lock

import psycopg2
from psycopg2.extensions import parse_dsn

dsn = os.environ.get('STYLEAR_TEST_DATABASE_URL', '')
param = parse_dsn(dsn)
assert param.get('host') == '127.0.0.1' and param.get('dbname', '').startswith('stylear_test_')
assert dsn == os.environ.get('DATABASE_URL')
# Windows can briefly retain the port when the previous fixture closes.
api_socket = socket.socket()
limite_puerto = time.monotonic() + 45
while True:
    try:
        api_socket.bind(('127.0.0.1', 18127))
        break
    except OSError as error:
        if getattr(error, 'winerror', None) not in (10013, 10048) or time.monotonic() >= limite_puerto:
            raise
        time.sleep(1)

backend = Path(__file__).resolve().parents[2] / 'tr-backend'
sys.path.insert(0, str(backend))
os.chdir(backend)
spec = importlib.util.spec_from_file_location('fixture_helpers', backend / 'tests/test_multitenant_integration.py')
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
actor = helpers.actor.__wrapped__()
a, b, plan, _ = helpers.empresas.__wrapped__(actor)
for empresa, nombre in ((a, 'Atelier Norte'), (b, 'Casa Oliva')):
    helpers.consulta('UPDATE empresa SET nombre=%s WHERE id=%s', (nombre, empresa['id']))
    empresa['nombre'] = nombre
sa, pa, va = helpers.mercaderia(a)
sb, pb, vb = helpers.mercaderia(b)
helpers.consulta("UPDATE producto SET nombre='Prenda Empresa A' WHERE id=%s", (pa,))
helpers.consulta("UPDATE producto SET nombre='Prenda Empresa B' WHERE id=%s", (pb,))
ca = helpers.cliente(a)
cb = helpers.cliente(b)

def personal(rol):
    nombre = rol.lower() + uuid4().hex[:8]
    rid = helpers.consulta('SELECT id FROM rol WHERE nombre=%s', (rol,), True)['id']
    usuario = helpers.crear_usuario_con_rol('Personal', 'Prueba', nombre, nombre+'@example.invalid', helpers.hashear_password('Prueba-aislada-123'), rid, rol, None, a['admin_usuario_id'], a['id'])
    if rol in {'CAJERO', 'ENCARGADO_SUCURSAL'}:
        helpers.consulta("INSERT INTO empleado(usuario_id,sucursal_id,codigo_empleado,cargo,empresa_id) VALUES(%s,%s,%s,'Prueba',%s)", (usuario['id'],sa,nombre,a['id']))
    else:
        pid = helpers.consulta("INSERT INTO proveedor(nombre,empresa_id) VALUES('Proveedor A',%s) RETURNING id",(a['id'],),True)['id']
        helpers.consulta('INSERT INTO proveedor_usuario(proveedor_id,usuario_id,empresa_id) VALUES(%s,%s,%s)',(pid,usuario['id'],a['id']))
    return nombre

datos = {'a': a, 'b': b, 'clienteA': ca[2], 'clienteB': cb[2], 'cajero': personal('CAJERO'), 'encargado': personal('ENCARGADO_SUCURSAL'), 'proveedor': personal('PROVEEDOR'), 'productoA': pa, 'productoB': pb, 'varianteA': va, 'sucursalA': sa, 'plan': plan['id'], 'as': helpers.consulta('SELECT username FROM usuario WHERE id=%s',(actor,),True)['username']}
if os.environ.get('STYLEAR_E2E_REPORTES') == '1':
    helpers.consulta("INSERT INTO venta(empresa_id,sucursal_id,codigo,subtotal,total) SELECT %s,%s,'CU22-'||n,2,2 FROM generate_series(1,5200)n",(a['id'],sa))
    datos['sucursalB'] = sb

if os.environ.get('STYLEAR_E2E_INTELIGENCIA') == '1':
    from datetime import date,timedelta
    from app.modules.reservas.repositories.carrito_repository import agregar_item_carrito
    from app.modules.reservas.repositories.reserva_repository import crear_reserva_desde_carrito
    for i in range(2):
        agregar_item_carrito(ca[1],va,sa,1)
        reserva=crear_reserva_desde_carrito(ca[0],a['id'],sa,date.today()+timedelta(days=1),None)
        datos['reservaA']=reserva['id']
    helpers.consulta("UPDATE producto SET descripcion='Prenda suave',material='Algodón' WHERE id=%s",(pa,))
    promo=helpers.consulta("INSERT INTO promocion(empresa_id,nombre,tipo_descuento,valor,fecha_inicio,fecha_fin) VALUES(%s,'Oferta','PORCENTAJE',20,CURRENT_DATE,CURRENT_DATE+1) RETURNING id",(a['id'],),True)['id']
    helpers.consulta('INSERT INTO promocion_producto(empresa_id,promocion_id,producto_id) VALUES(%s,%s,%s)',(a['id'],promo,pa))
    helpers.consulta('INSERT INTO promocion_sucursal(empresa_id,promocion_id,sucursal_id) VALUES(%s,%s,%s)',(a['id'],promo,sa))

if os.environ.get('STYLEAR_E2E_NOTIFICACIONES') == '1':
    venta=helpers.consulta("INSERT INTO venta(empresa_id,sucursal_id,cliente_id,codigo,subtotal,total) VALUES(%s,%s,%s,'CU27-COMPRA',10,10) RETURNING id",(a['id'],sa,ca[1]),True)['id']
    for n in range(45):
        helpers.consulta("INSERT INTO notificacion_usuario(empresa_id,usuario_id,clave,titulo,mensaje,categoria,recurso_tipo,recurso_id,accion) VALUES(%s,%s,%s,%s,'Actualización sintética de ensayo',%s,'RESERVA',%s,'VER_DETALLE')",(a['id'],ca[0],'cu27-'+str(n),'Aviso de ensayo '+str(n),'RESERVA' if n%2 else 'GENERAL',datos['reservaA']))
    datos['notaVenta']=helpers.consulta("INSERT INTO notificacion_usuario(empresa_id,usuario_id,clave,titulo,mensaje,categoria,recurso_tipo,recurso_id,accion) VALUES(%s,%s,'cu27-venta','Compra de ensayo','Compra registrada','COMPRA','VENTA',%s,'VER_DETALLE') RETURNING id",(a['id'],ca[0],venta),True)['id']
    datos['notaB']=helpers.consulta("INSERT INTO notificacion_usuario(empresa_id,usuario_id,clave,titulo,mensaje,categoria) VALUES(%s,%s,'cu27-b','Aviso privado B','Solo cliente B','GENERAL') RETURNING id",(b['id'],cb[0]),True)['id']

if os.environ.get('STYLEAR_E2E_MAYORISTA') == '1':
    from datetime import date
    from decimal import Decimal

    talla = helpers.catalogo.crear_talla('L', None, empresa_id=a['id'])
    color = helpers.catalogo.crear_color('Verde', None, empresa_id=a['id'])
    variante = helpers.variantes.crear_variante(a['id'], pa, talla['id'], color['id'], 'MAYORISTA-E2E')
    helpers.variantes.asignar_precio(variante, a['id'], Decimal('50'), date(2020, 1, 1), None)
    helpers.consulta(
        'INSERT INTO inventario_sucursal(empresa_id,sucursal_id,producto_variante_id,stock_disponible) VALUES(%s,%s,%s,%s)',
        (a['id'], sa, variante, 4),
    )
    datos['variantesMayorista'] = [va, variante]

# CU19: prenda de reemplazo disponible solo en la base de pruebas.
if os.environ.get('STYLEAR_E2E_CAMBIOS') == '1':
    from datetime import date
    from decimal import Decimal
    pv = helpers.consulta('SELECT v.*,p.categoria_id FROM producto_variante v JOIN producto p ON p.id=v.producto_id WHERE v.id=%s',(va,),True)
    pr = helpers.consulta("INSERT INTO producto(empresa_id,categoria_id,nombre) VALUES(%s,%s,'Prenda de reemplazo') RETURNING id",(a['id'],pv['categoria_id']),True)['id']
    vr = helpers.variantes.crear_variante(a['id'],pr,pv['talla_id'],pv['color_id'],'REEMPLAZO-E2E')
    helpers.variantes.asignar_precio(vr,a['id'],Decimal('30'),date(2020,1,1),None)
    helpers.consulta('INSERT INTO inventario_sucursal(empresa_id,sucursal_id,producto_variante_id,stock_disponible) VALUES(%s,%s,%s,5)',(a['id'],sa,vr))
    datos['reemplazoA'] = vr
Path(__file__).with_name('.fixture.json').write_text(json.dumps(datos),encoding='utf-8')

from cryptography.fernet import Fernet
import uvicorn
from app.modules.autenticacion.services import password_reset_service

# Captura de correo exclusiva de esta fixture: jamás usa SMTP ni agrega rutas
# de prueba a la aplicación. Los códigos sintéticos quedan fuera de Git.
captura = Path(__file__).with_name('.correos.json')
captura.write_text('{}', encoding='utf-8')
correo_lock = Lock()
def capturar_correo(destino, asunto, cuerpo):
    assert destino.endswith('@example.invalid')
    with correo_lock:
        mensajes = json.loads(captura.read_text(encoding='utf-8'))
        mensajes[destino] = re.search(r'Codigo: (\d{6})', cuerpo)[1]
        captura.write_text(json.dumps(mensajes), encoding='utf-8')
password_reset_service.enviar_correo = capturar_correo

# Notas de venta: comprobar el adjunto sin enviar correo fuera de la fixture.
from app.core import email as correo_comercial
from app.modules.administracion.services import respaldo_service
from app.modules.inteligencia.services import reporte_service
from app.modules.ventas_inventario.services import push_worker

respaldo_service.ejecutar_respaldos_programados = lambda: 0
reporte_service.ejecutar_reportes_programados = lambda: 0
push_worker.procesar = lambda: 0

def capturar_nota(destino, asunto, cuerpo, archivo, nombre, emisor):
    assert destino.endswith('@example.invalid')
    assert archivo.startswith(b'%PDF') and nombre.endswith('.pdf')
    assert emisor in asunto and emisor in cuerpo
correo_comercial.enviar_correo_con_adjunto = capturar_nota
if os.environ.get('STYLEAR_E2E_REPORTES') == '1':
    reporte_service.AI_REPORTS_PROVIDER = 'LOCAL'
    def capturar_reporte(destino, asunto, cuerpo, archivo, nombre, *args):
        assert destino.endswith('@example.invalid')
        assert (nombre.endswith('.pdf') and archivo.startswith(b'%PDF')) or (nombre.endswith('.xlsx') and archivo.startswith(b'PK'))
    correo_comercial.enviar_correo_con_adjunto = capturar_reporte

# Proveedor de rutas simulado exclusivamente en la base desechable de CU18.
if os.environ.get('STYLEAR_E2E_RUTAS') == '1':
    helpers.consulta('UPDATE sucursal SET latitud=-17.783327,longitud=-63.182140 WHERE id=%s AND empresa_id=%s',(sa,a['id']))
    from types import SimpleNamespace
    from app.modules.ventas_inventario.services import delivery_service as rutas
    os.environ['OPENROUTE_API_KEY'] = 'clave-sintetica-solo-fixture'
    post_original, get_original = rutas.requests.post, rutas.requests.get
    def rutas_post(url, **kwargs):
        if url == 'https://api.openrouteservice.org/v2/directions/driving-car/geojson':
            coords = kwargs['json']['coordinates']
            return SimpleNamespace(status_code=200,raise_for_status=lambda:None,json=lambda:{'features':[{'properties':{'summary':{'distance':4500,'duration':720}},'geometry':{'type':'LineString','coordinates':coords}}]})
        return post_original(url, **kwargs)
    def rutas_get(url, **kwargs):
        if url == 'https://nominatim.openstreetmap.org/search':
            return SimpleNamespace(raise_for_status=lambda:None,json=lambda:[{'display_name':'Avenida prueba 123, Santa Cruz','lat':'-17.77','lon':'-63.17'}])
        return get_original(url, **kwargs)
    rutas.requests.post, rutas.requests.get = rutas_post, rutas_get

if os.environ.get('STYLEAR_E2E_INTELIGENCIA') == '1':
    from app.modules.inteligencia.services import asistente_service,recomendacion_service
    asistente_service.AI_ASSISTANT_PROVIDER = 'RULES'
    def embedding_no_permitido(*args,**kwargs):
        raise AssertionError('La prueba no permite indexación externa.')
    recomendacion_service._crear_embedding = embedding_no_permitido

with tempfile.TemporaryDirectory(prefix='stylear_frontend_e2e_') as privado:
    os.environ['STYLEAR_BACKUP_DIR'] = str(Path(privado)/'copias')
    os.environ['STYLEAR_BACKUP_KEY'] = Fernet.generate_key().decode()
    os.environ['STYLEAR_BACKUP_RETENTION_DAYS'] = '7'
    os.environ.pop('STYLEAR_RESTORE_DATABASE_URL', None)
    os.environ.pop('STYLEAR_RESTORE_ASSETS_DIR', None)
    os.environ['STRIPE_SECRET_KEY'] = 'MODO_PRUEBA'
    os.environ['STYLEAR_PAGOS_PRUEBA'] = '1'
    respaldo_service.STATIC = Path(privado)/'static'
    if os.environ.get('STYLEAR_E2E_RESPALDOS') == '1':
        # CU25: cifrado y PostgreSQL reales; R2 exclusivamente en memoria.
        from io import BytesIO
        class R2Memoria:
            def __init__(self):
                self.archivos = {}
                self.lock = Lock()
            def put_object(self, **args):
                with self.lock:
                    self.archivos[args['Key']] = args['Body']
            def get_object(self, **args):
                with self.lock:
                    return {'Body': BytesIO(self.archivos[args['Key']])}
            def delete_object(self, **args):
                with self.lock:
                    self.archivos.pop(args['Key'], None)
        r2 = R2Memoria()
        cifrador = Fernet(os.environ['STYLEAR_BACKUP_KEY'].encode())
        respaldo_service.configuracion = lambda: (r2, 'bucket-simulado', cifrador, 30)
        restaurar_dsn = os.environ.get('STYLEAR_E2E_RESTORE_DATABASE_URL', '')
        destino = parse_dsn(restaurar_dsn)
        assert destino.get('host') == '127.0.0.1' and destino.get('dbname', '').startswith('stylear_test_')
        assert destino['dbname'] != param['dbname']
        os.environ['STYLEAR_RESTORE_DATABASE_URL'] = restaurar_dsn
        os.environ['STYLEAR_RESTORE_ASSETS_DIR'] = str(Path(privado)/'ensayo')
    from app.modules.ventas_inventario.services import nota_venta_service
    nota_venta_service.DIRECTORIO_LOGOS = Path(privado)/'static'/'empresas'
    with api_socket:
        uvicorn.Server(uvicorn.Config('app.main:app', log_level='warning')).run(sockets=[api_socket])
