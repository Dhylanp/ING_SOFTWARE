from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
import mysql.connector
from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from urllib.parse import quote
import bcrypt
import os
import re
import logging
import jwt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api-lista-espera")

app = FastAPI(title="API Lista de Espera")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ======================================================================
# Utilidades de prioridad
# ======================================================================
_PRIORIDAD_A_BD = {
    'alta': '1', 'media': '2', 'baja': '3',
    '1': '1', '2': '2', '3': '3',
}
_PRIORIDAD_DESDE_BD = {
    '1': 'alta', '2': 'media', '3': 'baja',
    'alta': 'alta', 'media': 'media', 'baja': 'baja',
}


def normaliza_prioridad_entrada(valor: str) -> str:
    if valor is None:
        raise ValueError("prioridad no puede ser nula")
    v = str(valor).strip().lower()
    if v not in _PRIORIDAD_A_BD:
        raise ValueError("prioridad debe ser 'alta', 'media' o 'baja'")
    return _PRIORIDAD_A_BD[v]


def normaliza_prioridad_salida(valor):
    if valor is None:
        return None
    v = str(valor).strip().lower()
    return _PRIORIDAD_DESDE_BD.get(v, v)


# ======================================================================
# Utilidades de contraseña
# ======================================================================
def hash_clave(clave: str) -> str:
    if not isinstance(clave, str) or clave == "":
        raise ValueError("La clave no puede estar vacía")
    pwd_bytes = clave.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verifica_clave(clave: str, hash_guardado: str) -> bool:
    if not clave or not hash_guardado:
        return False
    try:
        pwd_bytes = clave.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hash_guardado.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ======================================================================
# Conexión a MySQL
# ======================================================================
def _get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(
            f"Falta la variable de entorno '{name}'. "
            f"Configúrala en Railway (Settings → Variables) apuntando al servicio MySQL."
        )
    return value


def get_conexion():
    return mysql.connector.connect(
        host=_get_env("MYSQLHOST"),
        port=int(_get_env("MYSQLPORT", "3306")),
        database=_get_env("MYSQLDATABASE"),
        user=_get_env("MYSQLUSER"),
        password=_get_env("MYSQLPASSWORD"),
        connection_timeout=10,
    )


# ======================================================================
# Autenticación JWT (HU11)
# ======================================================================
JWT_ALG = "HS256"


def crea_token(id_persona: int, id_rol: int) -> str:
    payload = {
        "sub": str(id_persona),
        "rol": int(id_rol),
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
    }
    return jwt.encode(payload, _get_env("JWT_SECRET"), algorithm=JWT_ALG)


def requiere_rol(*roles_permitidos: int):
    def verificador(authorization: str | None = Header(default=None)):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Sesión requerida")
        try:
            datos = jwt.decode(
                authorization[7:], _get_env("JWT_SECRET"), algorithms=[JWT_ALG]
            )
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Sesión inválida o expirada")
        if datos.get("rol") not in roles_permitidos:
            raise HTTPException(status_code=403, detail="No tiene permisos para esta acción")
        return datos
    return verificador


# ======================================================================
# Modelos Pydantic
# ======================================================================
class Login(BaseModel):
    rut: int
    clave: str = Field(min_length=1, max_length=72)
    rol: int


class personaEntrada(BaseModel):
    rut: int
    dv: str = Field(min_length=1, max_length=1)
    nombrePersona: str
    clave: str = Field(min_length=8, max_length=72)
    fechaNac: date
    calle: str
    idComuna: int


class personaCompara(BaseModel):
    rut: int
    dv: str = Field(min_length=1, max_length=1)
    nombrePersona: str
    fechaNac: date
    calle: str
    idComuna: int
    numero: int
    correo: str = Field(min_length=6, max_length=50)


class formularioEntrada(BaseModel):
    descripcion: str = Field(min_length=0, max_length=200)
    fechaInicio: date
    idPersona: int
    idCesfam: int
    idHospital: int
    idEspecialidad: int
    prioridad: str


class accesoEntrada(BaseModel):
    idCesfam: int
    idHospital: int
    idPersona: int
    idRol: int


# --- Reglas de validación para actualizar contacto (HU13) ---
TEL_REGEX = re.compile(r"^9\d{8}$")
CORREO_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CORREO_MAX = 50
CALLE_MIN, CALLE_MAX = 3, 50
MAX_TELEFONOS = 5
MAX_CORREOS = 5


class contactoActualiza(BaseModel):
    telefonos: list[str] | None = None
    correos: list[str] | None = None
    calle: str | None = None
    idComuna: int | None = Field(default=None, gt=0)

    @field_validator("telefonos")
    @classmethod
    def valida_telefonos(cls, valor):
        if valor is None:
            return valor
        limpios = []
        for original in valor:
            t = re.sub(r"[\s\-()]", "", original)
            if t.startswith("+56"):
                t = t[3:]
            elif t.startswith("56") and len(t) == 11:
                t = t[2:]
            if not TEL_REGEX.match(t):
                raise ValueError(
                    f"Teléfono inválido: '{original}'. Debe tener 9 dígitos y empezar con 9"
                )
            if t not in limpios:
                limpios.append(t)
        if not 1 <= len(limpios) <= MAX_TELEFONOS:
            raise ValueError(f"Debe haber entre 1 y {MAX_TELEFONOS} teléfonos")
        return limpios

    @field_validator("correos")
    @classmethod
    def valida_correos(cls, valor):
        if valor is None:
            return valor
        limpios = []
        for original in valor:
            c = original.strip().lower()
            if len(c) > CORREO_MAX or not CORREO_REGEX.match(c):
                raise ValueError(
                    f"Correo inválido: '{original}'. Formato esperado: nombre@dominio.cl (máx. {CORREO_MAX} caracteres)"
                )
            if c not in limpios:
                limpios.append(c)
        if not 1 <= len(limpios) <= MAX_CORREOS:
            raise ValueError(f"Debe haber entre 1 y {MAX_CORREOS} correos")
        return limpios

    @field_validator("calle")
    @classmethod
    def valida_calle(cls, valor):
        if valor is None:
            return valor
        calle = " ".join(valor.split())
        if not CALLE_MIN <= len(calle) <= CALLE_MAX:
            raise ValueError(f"La calle debe tener entre {CALLE_MIN} y {CALLE_MAX} caracteres")
        return calle


# ======================================================================
# Endpoints
# ======================================================================
@app.get("/")
def inicio():
    return {"mensaje": "Bienvenido a la API de Lista de Espera"}


@app.post("/login")
def login(datos: Login):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            "SELECT idPersona, clave FROM persona WHERE rut = %s",
            (datos.rut,)
        )
        persona = cursor.fetchone()

        if persona is None:
            raise HTTPException(status_code=404, detail="Usuario no existe")

        if not verifica_clave(datos.clave, persona["clave"]):
            raise HTTPException(status_code=401, detail="Clave incorrecta")

        query_acceso = """
            SELECT
                p.idPersona,
                p.nombrePersona,
                p.idComuna,
                p.rut,
                a.idRol,
                a.idHospital,
                a.idCesfam,
                ce.nombreCesfam AS nombreCesfam,
                h.nombreHospital AS nombreHospital
            FROM persona p
            LEFT JOIN acceso a
                ON p.idPersona = a.idPersona
                AND a.idRol = %s
            LEFT JOIN cesfam   ce ON a.idCesfam   = ce.idCesfam
            LEFT JOIN hospital h  ON a.idHospital = h.idHospital
            WHERE p.rut = %s
            AND a.activo = %s
        """
        cursor.execute(query_acceso, (datos.rol, datos.rut, 'S'))
        respuesta = cursor.fetchall()

        if len(respuesta) != 0:
            token = crea_token(respuesta[0]["idPersona"], datos.rol)
            for fila in respuesta:
                fila["token"] = token
            return respuesta

        raise HTTPException(status_code=403, detail="El usuario no posee acceso con ese rol")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en /login")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor is not None:
            cursor.close()
        if conexion is not None:
            conexion.close()


@app.post("/persona", status_code=201)
def creaPersona(persona: personaEntrada):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT idPersona FROM persona WHERE rut = %s", (persona.rut,))
        if cursor.fetchone():
            return {"codigo": 0, "mensaje": "Ya existe un Usuario asignado a ese RUT"}

        query = """
            INSERT INTO persona
                (rut, dv, calle, nombrePersona, clave, fechaNac, idComuna)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
        """
        clave_hash = hash_clave(persona.clave)
        valores = (
            persona.rut, persona.dv, persona.calle,
            persona.nombrePersona, clave_hash,
            persona.fechaNac, persona.idComuna
        )
        cursor.execute(query, valores)
        idPersona = cursor.lastrowid

        query_acceso = """
            INSERT INTO acceso
                (Activo, idCesfam, idHospital, idPersona, idRol)
            VALUES
                (%s, %s, %s, %s, %s)
        """
        cursor.execute(query_acceso, ("S", 0, 0, idPersona, 3))

        conexion.commit()
        return {"codigo": 1, "mensaje": "Éxito para ingresar Persona y dar acceso de Usuario"}

    except Exception as e:
        if conexion:
            conexion.rollback()
        logger.exception("Error en /persona")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/persona")
def obtienePersonas():
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(
            "SELECT idPersona, rut, dv, nombrePersona, fechaNac, calle, idComuna "
            "FROM persona ORDER BY nombrePersona"
        )
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron personas")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /persona")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/rol")
def obtieneRoles():
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT idRol, nombreRol FROM rol ORDER BY idRol")
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron roles")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /rol")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.post("/formulario", status_code=201)
def creaFormulario(formulario: formularioEntrada):
    conexion = None
    cursor = None
    try:
        try:
            prioridad_bd = normaliza_prioridad_entrada(formulario.prioridad)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(
            "SELECT idEspecialidad FROM especialidad WHERE idEspecialidad = %s",
            (formulario.idEspecialidad,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=422, detail="La especialidad no existe")
        query = """
            INSERT INTO formulario
                (descripcion, fechaInicio, idPersona, idCesfam, idHospital, idEstado, prioridadClinica, idEspecialidad)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        valores = (
            formulario.descripcion, formulario.fechaInicio,
            formulario.idPersona, formulario.idCesfam,
            formulario.idHospital, 1, prioridad_bd,
            formulario.idEspecialidad
        )
        cursor.execute(query, valores)
        conexion.commit()
        return {"codigo": 1, "mensaje": "Éxito para ingresar Formulario"}

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
        logger.exception("Error en POST /formulario")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.post("/acceso", status_code=201)
def creaAcceso(acceso: accesoEntrada, _=Depends(requiere_rol(4))):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT idPersona
            FROM acceso
            WHERE idPersona = %s
              AND idRol = %s
              AND idCesfam = %s
              AND idHospital = %s
            """,
            (acceso.idPersona, acceso.idRol, acceso.idCesfam, acceso.idHospital)
        )

        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="Ese acceso ya existe para esta persona con ese rol y centro."
            )

        query = """
            INSERT INTO acceso
                (Activo, idCesfam, idHospital, idPersona, idRol)
            VALUES
                (%s, %s, %s, %s, %s)
        """
        valores = ('S', acceso.idCesfam, acceso.idHospital, acceso.idPersona, acceso.idRol)
        cursor.execute(query, valores)
        conexion.commit()
        return {"codigo": 1, "mensaje": "Éxito para permitir Acceso"}

    except HTTPException:
        raise
    except mysql.connector.IntegrityError as e:
        if conexion:
            conexion.rollback()
        if getattr(e, "errno", None) == 1062:
            raise HTTPException(
                status_code=409,
                detail="Ese acceso ya existe para esta persona con ese rol y centro."
            )
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        if conexion:
            conexion.rollback()
        logger.exception("Error en POST /acceso")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/region")
def obtieneRegiones():
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT idRegion, nombreRegion FROM region")
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron regiones")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /region")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()
            
@app.get("/especialidad")
def obtieneEspecialidades():
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(
            "SELECT idEspecialidad, nombreEspecialidad "
            "FROM especialidad ORDER BY nombreEspecialidad"
        )
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron especialidades")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /especialidad")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

@app.get("/comuna/{region}")
def obtieneComunas(region: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        query = "SELECT idComuna, nombreComuna FROM comuna"
        if region != 0:
            query += " WHERE idRegion = %s"
            cursor.execute(query, (region,))
        else:
            cursor.execute(query)
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron comunas para esta región")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /comuna/{region}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/hospital/{comuna}")
def obtieneHospitales(comuna: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        query = "SELECT idHospital, nombreHospital, calle, idComuna FROM hospital"
        if comuna != 0:
            query += " WHERE idComuna = %s"
            cursor.execute(query, (comuna,))
        else:
            cursor.execute(query)
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron hospitales para esta comuna")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /hospital/{comuna}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/cesfam/{comuna}")
def obtieneCesfams(comuna: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        query = "SELECT idCesfam, nombreCesfam, calle FROM cesfam"
        if comuna != 0:
            query += " WHERE idComuna = %s"
            cursor.execute(query, (comuna,))
        else:
            cursor.execute(query)
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron CESFAMs para esta comuna")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /cesfam/{comuna}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/contactos/{persona}")
def obtieneDatosContacto(persona: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        query = """
            SELECT
                p.idPersona,
                p.calle,
                c.nombreComuna AS Comuna,
                r.nombreRegion AS Region,
                (SELECT GROUP_CONCAT(CONCAT(pc.contactos, ':', pc.tipo) SEPARATOR ';')
                 FROM persona_contactos pc
                 WHERE pc.idPersona = p.idPersona) AS Contactos,
                (SELECT GROUP_CONCAT(pcor.correos SEPARATOR ';')
                 FROM persona_correos pcor
                 WHERE pcor.idPersona = p.idPersona) AS Correos
            FROM persona p
            LEFT JOIN comuna c ON p.idComuna = c.idComuna
            LEFT JOIN region r ON c.idRegion = r.idRegion
            WHERE p.idPersona = %s
        """
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(query, (persona,))
        respuesta = cursor.fetchall()
        if len(respuesta) != 0:
            return respuesta
        raise HTTPException(status_code=404, detail="No se encontraron datos de contacto")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /contactos/{persona}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


def _lee_contacto(cursor, persona: int):
    cursor.execute(
        """
        SELECT
            p.idPersona,
            p.calle,
            c.nombreComuna AS Comuna,
            r.nombreRegion AS Region,
            (SELECT GROUP_CONCAT(CONCAT(pc.contactos, ':', pc.tipo) SEPARATOR ';')
             FROM persona_contactos pc
             WHERE pc.idPersona = p.idPersona) AS Contactos,
            (SELECT GROUP_CONCAT(pcor.correos SEPARATOR ';')
             FROM persona_correos pcor
             WHERE pcor.idPersona = p.idPersona) AS Correos
        FROM persona p
        LEFT JOIN comuna c ON p.idComuna = c.idComuna
        LEFT JOIN region r ON c.idRegion = r.idRegion
        WHERE p.idPersona = %s
        """,
        (persona,)
    )
    return cursor.fetchall()


@app.patch("/contactos/{persona}")
def actualizaDatosContacto(persona: int, datos: contactoActualiza):
    if (datos.telefonos is None and datos.correos is None
            and datos.calle is None and datos.idComuna is None):
        raise HTTPException(
            status_code=400,
            detail="Debes enviar al menos un campo para actualizar"
        )

    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("SELECT idPersona FROM persona WHERE idPersona = %s", (persona,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="No se encontró la persona")

        if datos.idComuna is not None:
            cursor.execute("SELECT idComuna FROM comuna WHERE idComuna = %s", (datos.idComuna,))
            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=422,
                    detail=[{"loc": ["body", "idComuna"], "msg": "La comuna no existe"}]
                )

        campos = []
        valores = []
        if datos.calle is not None:
            campos.append("calle = %s")
            valores.append(datos.calle)
        if datos.idComuna is not None:
            campos.append("idComuna = %s")
            valores.append(datos.idComuna)
        if campos:
            valores.append(persona)
            cursor.execute(
                "UPDATE persona SET " + ", ".join(campos) + " WHERE idPersona = %s",
                tuple(valores)
            )

        # Teléfonos: se reemplaza la lista completa (tipo por defecto 'P')
        if datos.telefonos is not None:
            cursor.execute("DELETE FROM persona_contactos WHERE idPersona = %s", (persona,))
            cursor.executemany(
                "INSERT INTO persona_contactos (contactos, idPersona, tipo) VALUES (%s, %s, %s)",
                [(t, persona, 'P') for t in datos.telefonos]
            )

        if datos.correos is not None:
            cursor.execute("DELETE FROM persona_correos WHERE idPersona = %s", (persona,))
            cursor.executemany(
                "INSERT INTO persona_correos (correos, idPersona) VALUES (%s, %s)",
                [(c, persona) for c in datos.correos]
            )

        conexion.commit()
        return _lee_contacto(cursor, persona)

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
        logger.exception("Error en PATCH /contactos/{persona}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/comparaDatos/{rut}/{dv}/{nombrePersona}/{fechaNac}/{calle}/{idComuna}/{numero}/{correo}")
def comparaDatosPersona(
    rut: int, dv: str, nombrePersona: str, fechaNac: date,
    calle: str, idComuna: int, numero: int, correo: str
):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        query = """
            SELECT
                p.rut,
                p.dv,
                p.nombrePersona,
                p.fechaNac,
                p.calle,
                p.idComuna,
                EXISTS (
                    SELECT 1 FROM persona_contactos pc
                    WHERE pc.idPersona = p.idPersona
                    AND pc.contactos = %s
                ) AS telefonoCoincide,
                EXISTS (
                    SELECT 1 FROM persona_correos pco
                    WHERE pco.idPersona = p.idPersona
                    AND pco.correos = %s
                ) AS correoCoincide
            FROM persona p
            WHERE p.rut = %s
        """
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(query, (numero, correo, rut))
        respuesta = cursor.fetchone()

        if respuesta is None:
            raise HTTPException(status_code=404, detail="No se encontró una persona con el RUT indicado")

        datosNoCoinciden = []

        if str(respuesta["dv"]).strip().upper() != str(dv).strip().upper():
            datosNoCoinciden.append("dígito verificador")
        if respuesta["nombrePersona"].strip() != nombrePersona.strip():
            datosNoCoinciden.append("nombre de la persona")
        if respuesta["fechaNac"] != fechaNac:
            datosNoCoinciden.append("fecha de nacimiento")
        if respuesta["calle"].strip() != calle.strip():
            datosNoCoinciden.append("calle")
        if respuesta["idComuna"] != idComuna:
            datosNoCoinciden.append("comuna")
        if not respuesta["telefonoCoincide"]:
            datosNoCoinciden.append("número de teléfono")
        if not respuesta["correoCoincide"]:
            datosNoCoinciden.append("correo electrónico")

        if len(datosNoCoinciden) == 0:
            return {"codigo": 1, "mensaje": "Todos los datos coinciden"}

        return {
            "codigo": 1,
            "mensaje": "Los siguientes datos no coinciden: " + ", ".join(datosNoCoinciden)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /comparaDatos")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/formulario/{persona}/{cesfam}/{hospital}/{estado}/{prioridad}")
def obtieneFormularios(persona: int, cesfam: int, hospital: int, estado: int, prioridad: str):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        query = """
            SELECT f.idFormulario, f.descripcion, f.fechaInicio,
                   p.nombrePersona,
                   ce.nombreCesfam AS nombreCesfam,
                   h.nombreHospital,
                   e.nombreEstado,
                   f.prioridadClinica,
                   f.idEspecialidad,
                   esp.nombreEspecialidad
            FROM formulario f
            LEFT JOIN persona  p  ON f.idPersona  = p.idPersona
            LEFT JOIN cesfam   ce ON f.idCesfam   = ce.idCesfam
            LEFT JOIN hospital h  ON f.idHospital = h.idHospital
            LEFT JOIN estados  e  ON f.idEstado   = e.idEstado
            LEFT JOIN especialidad esp ON f.idEspecialidad = esp.idEspecialidad
        """
        cursor = conexion.cursor(dictionary=True)
        condiciones = []
        filtro = []

        if persona != 0:
            condiciones.append("f.idPersona = %s")
            filtro.append(persona)
        if cesfam != 0:
            condiciones.append("f.idCesfam = %s")
            filtro.append(cesfam)
        if hospital != 0:
            condiciones.append("f.idHospital = %s")
            filtro.append(hospital)
        if estado != 0:
            condiciones.append("f.idEstado = %s")
            filtro.append(estado)

        prioridad_norm = (prioridad or "").strip().lower()
        if prioridad_norm and prioridad_norm not in ("todas", "0", "none"):
            if prioridad_norm not in _PRIORIDAD_A_BD:
                raise HTTPException(
                    status_code=400,
                    detail="prioridad debe ser 'alta', 'media', 'baja' o 'todas'"
                )
            condiciones.append("f.prioridadClinica = %s")
            filtro.append(_PRIORIDAD_A_BD[prioridad_norm])

        if condiciones:
            query += " WHERE " + " AND ".join(condiciones)

        cursor.execute(query, tuple(filtro))
        filas = cursor.fetchall()

        for fila in filas:
            if 'prioridadClinica' in fila:
                fila['prioridadClinica'] = normaliza_prioridad_salida(fila['prioridadClinica'])
        return filas

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /formulario/{...}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/formulario/filtrar")
def filtraFormularios(
    persona: int = 0,
    cesfam: int = 0,
    hospital: int = 0,
    especialidad: int = 0,
    estados: str = "",
    prioridad: str = "todas",
    desde: date | None = None,
    hasta: date | None = None,
):
    conexion = None
    cursor = None
    try:
        lista_estados = []
        if estados.strip():
            try:
                lista_estados = [int(e) for e in estados.split(",")]
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="estados debe ser una lista de números separados por coma, por ejemplo '1,2'"
                )

        if desde and hasta and desde > hasta:
            raise HTTPException(
                status_code=400,
                detail="La fecha 'desde' no puede ser posterior a la fecha 'hasta'"
            )

        conexion = get_conexion()
        query = """
            SELECT f.idFormulario, f.descripcion, f.fechaInicio,
                   p.nombrePersona,
                   ce.nombreCesfam AS nombreCesfam,
                   h.nombreHospital,
                   e.nombreEstado,
                   f.prioridadClinica,
                   f.idEspecialidad,
                   esp.nombreEspecialidad
            FROM formulario f
            LEFT JOIN persona  p  ON f.idPersona  = p.idPersona
            LEFT JOIN cesfam   ce ON f.idCesfam   = ce.idCesfam
            LEFT JOIN hospital h  ON f.idHospital = h.idHospital
            LEFT JOIN estados  e  ON f.idEstado   = e.idEstado
            LEFT JOIN especialidad esp ON f.idEspecialidad = esp.idEspecialidad
        """
        cursor = conexion.cursor(dictionary=True)
        condiciones = []
        filtro = []

        if persona != 0:
            condiciones.append("f.idPersona = %s")
            filtro.append(persona)
        if cesfam != 0:
            condiciones.append("f.idCesfam = %s")
            filtro.append(cesfam)
        if hospital != 0:
            condiciones.append("f.idHospital = %s")
            filtro.append(hospital)
            
        if especialidad != 0:
            condiciones.append("f.idEspecialidad = %s")
            filtro.append(especialidad)

        if lista_estados:
            marcadores = ", ".join(["%s"] * len(lista_estados))
            condiciones.append(f"f.idEstado IN ({marcadores})")
            filtro.extend(lista_estados)

        prioridad_norm = (prioridad or "").strip().lower()
        if prioridad_norm and prioridad_norm not in ("todas", "0", "none"):
            if prioridad_norm not in _PRIORIDAD_A_BD:
                raise HTTPException(
                    status_code=400,
                    detail="prioridad debe ser 'alta', 'media', 'baja' o 'todas'"
                )
            condiciones.append("f.prioridadClinica = %s")
            filtro.append(_PRIORIDAD_A_BD[prioridad_norm])

        if desde:
            condiciones.append("f.fechaInicio >= %s")
            filtro.append(desde)
        if hasta:
            condiciones.append("f.fechaInicio <= %s")
            filtro.append(hasta)

        if condiciones:
            query += " WHERE " + " AND ".join(condiciones)

        cursor.execute(query, tuple(filtro))
        filas = cursor.fetchall()

        for fila in filas:
            if 'prioridadClinica' in fila:
                fila['prioridadClinica'] = normaliza_prioridad_salida(fila['prioridadClinica'])
        return filas

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /formulario/filtrar")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/Acceso/{rol}/{persona}/{cesfam}/{hospital}")
def obtieneAccesos(rol: int, persona: int, cesfam: int, hospital: int, _=Depends(requiere_rol(4))):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        query = """
            SELECT
                a.Activo AS activo,
                a.idRol AS idRol,
                a.idCesfam AS idCesfam,
                a.idHospital AS idHospital,
                CASE
                    WHEN a.idRol = 3 THEN 'x'
                    WHEN a.idCesfam != 0 THEN a.idCesfam
                    ELSE a.idHospital
                END AS idCentro,
                CASE
                    WHEN a.idRol = 3 THEN 'x'
                    WHEN a.idCesfam != 0 THEN c.nombreCesfam
                    ELSE h.nombreHospital
                END AS nombreCentro,
                CASE
                    WHEN a.idRol = 3 THEN 'x'
                    WHEN a.idCesfam != 0 THEN 'Cesfam'
                    ELSE 'Hospital'
                END AS tipoCentro,
                a.idPersona,
                p.nombrePersona
            FROM acceso a
            LEFT JOIN cesfam c ON a.idCesfam = c.idCesfam
            LEFT JOIN hospital h ON a.idHospital = h.idHospital
            INNER JOIN persona p ON a.idPersona = p.idPersona
        """
        condiciones = ["a.idRol != 3"]
        filtro = []

        if rol != 0:
            condiciones.append("a.idRol = %s")
            filtro.append(rol)
        if persona != 0:
            condiciones.append("a.idPersona = %s")
            filtro.append(persona)
        if cesfam != 0:
            condiciones.append("a.idCesfam = %s")
            filtro.append(cesfam)
        if hospital != 0:
            condiciones.append("a.idHospital = %s")
            filtro.append(hospital)

        if condiciones:
            query += " WHERE " + " AND ".join(condiciones)

        cursor = conexion.cursor(dictionary=True)
        cursor.execute(query, tuple(filtro))
        return cursor.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /Acceso/{...}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.delete("/acceso/{persona}/{rol}/{cesfam}/{hospital}")
def eliminaAcceso(persona: int, rol: int, cesfam: int, hospital: int, _=Depends(requiere_rol(4))):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor()

        query = """
            DELETE FROM acceso
            WHERE idPersona = %s
              AND idRol = %s
              AND idCesfam = %s
              AND idHospital = %s
        """
        cursor.execute(query, (persona, rol, cesfam, hospital))

        if cursor.rowcount == 0:
            conexion.rollback()
            raise HTTPException(
                status_code=404,
                detail="No se encontró el acceso para eliminar"
            )

        conexion.commit()
        return {"codigo": 1, "mensaje": "Acceso eliminado correctamente"}

    except HTTPException:
        raise
    except mysql.connector.Error as e:
        if conexion:
            conexion.rollback()
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(e)}")
    except Exception as e:
        if conexion:
            conexion.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


# ======================================================================
# Perfil de usuario (GET / PUT) con tipo de contacto P/E
# ======================================================================
_RE_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_RE_TELEFONO = re.compile(r"^\+?\d{8,15}$")


class TelefonoEntrada(BaseModel):
    numero: str
    tipo: str = Field(default="P", pattern="^[PE]$")


class perfilEdicion(BaseModel):
    calle: str = Field(min_length=1, max_length=100)
    idComuna: int
    telefonos: list[TelefonoEntrada] = Field(default_factory=list)
    correos: list[str] = Field(default_factory=list)


def _normaliza_telefonos(lista: list[TelefonoEntrada]) -> list[tuple[str, str]]:
    """Valida formato, elimina duplicados por número y normaliza el tipo."""
    resultado: list[tuple[str, str]] = []
    vistos: set[str] = set()
    for t in lista:
        valor = "".join(str(t.numero).split())
        if not _RE_TELEFONO.match(valor):
            raise HTTPException(
                status_code=400,
                detail=f"Teléfono no válido: '{t.numero}'. Usa entre 8 y 15 dígitos, con + opcional al inicio."
            )
        if valor in vistos:
            continue
        vistos.add(valor)
        tipo = (t.tipo or "P").upper()
        if tipo not in ("P", "E"):
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de contacto inválido: '{t.tipo}'. Debe ser 'P' o 'E'."
            )
        resultado.append((valor, tipo))
    return resultado


def _normaliza_correos(lista: list[str]) -> list[str]:
    resultado: list[str] = []
    vistos: set[str] = set()
    for c in lista:
        valor = str(c).strip()
        if not _RE_CORREO.match(valor) or len(valor) > 50:
            raise HTTPException(
                status_code=400,
                detail=f"Correo no válido: '{c}'. Revisa el formato (máximo 50 caracteres)."
            )
        if valor.lower() not in vistos:
            vistos.add(valor.lower())
            resultado.append(valor)
    return resultado


def _sincroniza(cursor, tabla: str, columna: str, idPersona: int,
                nuevos: list[str], ignora_mayusculas: bool = False):
    """Sincroniza una tabla simple (sin columnas extra)."""
    cursor.execute(f"SELECT {columna} AS valor FROM {tabla} WHERE idPersona = %s", (idPersona,))
    existentes = [str(f["valor"]).strip() for f in cursor.fetchall()]

    def clave(v: str) -> str:
        return v.lower() if ignora_mayusculas else v

    claves_nuevas = {clave(v) for v in nuevos}
    claves_existentes = {clave(v) for v in existentes}

    for valor in existentes:
        if clave(valor) not in claves_nuevas:
            cursor.execute(
                f"DELETE FROM {tabla} WHERE idPersona = %s AND {columna} = %s",
                (idPersona, valor)
            )

    for valor in nuevos:
        if clave(valor) not in claves_existentes:
            cursor.execute(
                f"INSERT INTO {tabla} (idPersona, {columna}) VALUES (%s, %s)",
                (idPersona, valor)
            )


def _sincroniza_telefonos(cursor, idPersona: int, nuevos: list[tuple[str, str]]):
    """
    Deja persona_contactos igual a 'nuevos' (lista de (numero, tipo)).
    - Elimina los que ya no están.
    - Inserta los nuevos.
    - Actualiza el tipo de los existentes si cambió.
    """
    cursor.execute(
        "SELECT contactos, tipo FROM persona_contactos WHERE idPersona = %s",
        (idPersona,)
    )
    existentes = {str(f["contactos"]).strip(): str(f["tipo"]).strip() for f in cursor.fetchall()}

    nuevos_dict = {num: tipo for num, tipo in nuevos}

    for numero in existentes:
        if numero not in nuevos_dict:
            cursor.execute(
                "DELETE FROM persona_contactos WHERE idPersona = %s AND contactos = %s",
                (idPersona, numero)
            )

    for numero, tipo in nuevos_dict.items():
        if numero not in existentes:
            cursor.execute(
                "INSERT INTO persona_contactos (idPersona, contactos, tipo) VALUES (%s, %s, %s)",
                (idPersona, numero, tipo)
            )
        elif existentes[numero] != tipo:
            cursor.execute(
                "UPDATE persona_contactos SET tipo = %s WHERE idPersona = %s AND contactos = %s",
                (tipo, idPersona, numero)
            )


@app.get("/persona/{idPersona}/perfil")
def obtienePerfil(idPersona: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                p.idPersona,
                p.rut,
                p.dv,
                p.nombrePersona,
                p.fechaNac,
                p.calle,
                p.idComuna,
                c.idRegion
            FROM persona p
            LEFT JOIN comuna c ON p.idComuna = c.idComuna
            WHERE p.idPersona = %s
            """,
            (idPersona,)
        )
        perfil = cursor.fetchone()
        if perfil is None:
            raise HTTPException(status_code=404, detail="Persona no encontrada")

        cursor.execute(
            "SELECT contactos AS numero, tipo FROM persona_contactos WHERE idPersona = %s",
            (idPersona,)
        )
        perfil["telefonos"] = [
            {"numero": str(f["numero"]).strip(), "tipo": str(f["tipo"]).strip()}
            for f in cursor.fetchall()
        ]

        cursor.execute(
            "SELECT correos AS valor FROM persona_correos WHERE idPersona = %s",
            (idPersona,)
        )
        perfil["correos"] = [str(f["valor"]).strip() for f in cursor.fetchall()]

        return perfil

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /persona/{idPersona}/perfil")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.put("/persona/{idPersona}/perfil")
def actualizaPerfil(idPersona: int, datos: perfilEdicion):
    conexion = None
    cursor = None
    try:
        telefonos = _normaliza_telefonos(datos.telefonos)
        correos = _normaliza_correos(datos.correos)
        calle = datos.calle.strip()
        if not calle:
            raise HTTPException(status_code=400, detail="La calle no puede estar vacía")

        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("SELECT idPersona FROM persona WHERE idPersona = %s", (idPersona,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Persona no encontrada")

        cursor.execute("SELECT idComuna FROM comuna WHERE idComuna = %s", (datos.idComuna,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=400, detail="La comuna indicada no existe")

        cursor.execute(
            "UPDATE persona SET calle = %s, idComuna = %s WHERE idPersona = %s",
            (calle, datos.idComuna, idPersona)
        )

        _sincroniza_telefonos(cursor, idPersona, telefonos)
        _sincroniza(cursor, "persona_correos", "correos", idPersona, correos, ignora_mayusculas=True)

        conexion.commit()
        return {"codigo": 1, "mensaje": "Información personal actualizada correctamente"}

    except HTTPException:
        if conexion:
            conexion.rollback()
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
        logger.exception("Error en PUT /persona/{idPersona}/perfil")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


# ======================================================================
# Documentos PDF adjuntos a una interconsulta
# ======================================================================
MAX_PDF_BYTES = 5 * 1024 * 1024  # 5 MB


@app.post("/formulario/{idFormulario}/documentos", status_code=201)
def subeDocumento(idFormulario: int, archivo: UploadFile = File(...)):
    conexion = None
    cursor = None
    try:
        nombre = os.path.basename(archivo.filename or "").strip()
        if not nombre.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

        contenido = archivo.file.read(MAX_PDF_BYTES + 1)
        if len(contenido) == 0:
            raise HTTPException(status_code=400, detail="El archivo está vacío")
        if len(contenido) > MAX_PDF_BYTES:
            raise HTTPException(status_code=400, detail="El archivo supera el máximo de 5 MB")
        if not contenido.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="El archivo no es un PDF válido")

        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            "SELECT idFormulario FROM formulario WHERE idFormulario = %s",
            (idFormulario,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="La interconsulta no existe")

        cursor.execute(
            """
            INSERT INTO formulario_documento
                (idFormulario, nombreArchivo, tipoMime, tamanoBytes, contenido)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (idFormulario, nombre[:255], "application/pdf", len(contenido), contenido)
        )
        conexion.commit()
        return {
            "codigo": 1,
            "mensaje": "Documento adjuntado correctamente",
            "idDocumento": cursor.lastrowid,
            "nombreArchivo": nombre[:255],
        }

    except HTTPException:
        raise
    except Exception as e:
        if conexion:
            conexion.rollback()
        logger.exception("Error en POST /formulario/{idFormulario}/documentos")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/formulario/{idFormulario}/documentos")
def listaDocumentos(idFormulario: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)

        cursor.execute(
            "SELECT idFormulario FROM formulario WHERE idFormulario = %s",
            (idFormulario,)
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="La interconsulta no existe")

        cursor.execute(
            """
            SELECT idDocumento, nombreArchivo, tamanoBytes, fechaSubida
            FROM formulario_documento
            WHERE idFormulario = %s
            ORDER BY fechaSubida DESC, idDocumento DESC
            """,
            (idFormulario,)
        )
        return cursor.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /formulario/{idFormulario}/documentos")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/documentos/{idDocumento}")
def descargaDocumento(idDocumento: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT nombreArchivo, tipoMime, contenido
            FROM formulario_documento
            WHERE idDocumento = %s
            """,
            (idDocumento,)
        )
        doc = cursor.fetchone()
        if doc is None:
            raise HTTPException(status_code=404, detail="El documento no existe")

        nombre = quote(doc["nombreArchivo"])
        return Response(
            content=bytes(doc["contenido"]),
            media_type=doc["tipoMime"],
            headers={"Content-Disposition": f"inline; filename*=UTF-8''{nombre}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error en GET /documentos/{idDocumento}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()