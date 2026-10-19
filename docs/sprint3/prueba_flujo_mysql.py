"""
Prueba de humo del flujo completo del Sprint 3 contra una API real conectada a MySQL.
Uso (desde la raíz del proyecto, con la API corriendo):
    JWT_SECRET=<el mismo de la API> python docs/sprint3/prueba_flujo_mysql.py [http://127.0.0.1:8000]
Requiere los datos de docs/sprint3/esquema_base_prueba.sql (personas 1, 2 y 3).
"""
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.getcwd())
from DATA.main import crea_token  # noqa: E402

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
ADMIN, ESPECIALISTA = (1, 1), (2, 2)  # (idPersona, rol)


def llama(metodo, ruta, quien, cuerpo=None):
    req = urllib.request.Request(
        BASE + ruta, method=metodo,
        data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
        headers={"Authorization": "Bearer " + crea_token(*quien), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]


def paso(nombre, esperado, metodo, ruta, quien, cuerpo=None):
    status, datos = llama(metodo, ruta, quien, cuerpo)
    print(f"[{'OK ' if status == esperado else 'FALLA'}] {nombre}: {status}")
    if status != esperado:
        print("       ", datos)
    return datos


nuevo = {"descripcion": "Dolor torácico", "fechaInicio": "2026-10-18", "idPersona": 3,
         "idCesfam": 1, "idHospital": 1, "idEspecialidad": 1, "prioridad": "alta"}
f = paso("HU19 registrar", 201, "POST", "/formulario", ADMIN, nuevo)["idFormulario"]
paso("HU23 devolver sin motivo -> 400", 400, "POST", f"/formulario/{f}/revision", ESPECIALISTA, {"accion": "devolver"})
paso("HU23 devolver con motivo", 200, "POST", f"/formulario/{f}/revision", ESPECIALISTA, {"accion": "devolver", "motivo": "Faltan exámenes"})
paso("HU16 alertas", 200, "GET", "/alertas/devoluciones", ADMIN)
paso("HU05A ver motivo", 200, "GET", f"/formulario/{f}/devolucion", ADMIN)
paso("HU05B corregir y reenviar", 200, "POST", f"/formulario/{f}/reenviar", ADMIN, {"descripcion": "Dolor torácico, ECG adjunto"})
paso("HU23 aceptar", 200, "POST", f"/formulario/{f}/revision", ESPECIALISTA, {"accion": "aceptar"})
paso("HU03 editar prioridad", 200, "PATCH", f"/formulario/{f}/administrativo", ADMIN, {"prioridad": "media"})
paso("HU17 asignar hora", 200, "POST", f"/formulario/{f}/cita", ESPECIALISTA, {"fecha": "2026-11-02", "hora": "10:30"})
paso("HU09 cerrar", 200, "POST", f"/formulario/{f}/cierre", ESPECIALISTA, {"causal": "Atendido"})
paso("HU03 finalizada no se edita -> 409", 409, "PATCH", f"/formulario/{f}/administrativo", ADMIN, {"prioridad": "baja"})
historial = paso("HU07 historial", 200, "GET", f"/formulario/{f}/historial", ADMIN)
print("        estados:", " -> ".join(h["estadoNuevo"] for h in historial))
lote = {"registros": [dict(nuevo, uuidLocal="uuid-prueba-0001", descripcion="Registrado sin conexión")]}
paso("HU21 sincronizar", 200, "POST", "/sincronizar", ADMIN, lote)
r = paso("HU21 reintento idempotente", 200, "POST", "/sincronizar", ADMIN, lote)
print("        duplicado:", r["resultados"][0].get("duplicado"))
correos = paso("HU15 bitácora de correos", 200, "GET", f"/formulario/{f}/notificaciones", ADMIN)
print("        correos registrados:", len(correos))
