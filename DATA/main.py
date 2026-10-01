from fastapi import FastAPI, HTTPException
import mysql.connector
from pydantic import BaseModel, Field
from datetime import date
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="API Lista de Espera")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class Login(BaseModel):
    rut: int
    clave: str
    rol: int


class personaEntrada(BaseModel):
    rut: int
    dv: str = Field(min_length=1, max_length=1)
    nombrePersona: str
    clave: str
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
    prioridad: str


class accesoEntrada(BaseModel):
    idCesfam: int
    idHospital: int
    idPersona: int
    idRol: int


@app.get("/")
def inicio():
    return {"mensaje": "Bienvenido a la API de Lista de Espera"}


@app.post("/login")
def login(datos: Login):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        query = """
            SELECT
                p.nombrePersona,
                p.idComuna,
                p.rut,
                a.idHospital,
                a.idCesfam
            FROM persona p
            LEFT JOIN acceso a
                ON p.idPersona = a.idPersona
                AND a.idRol = %s
            WHERE p.rut = %s
            AND p.clave = %s
            AND a.activo = %s
        """
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(query, (datos.rol, datos.rut, datos.clave, 'S'))
        respuesta = cursor.fetchall()

        if len(respuesta) != 0:
            return respuesta

        raise HTTPException(status_code=404, detail="No se posee Acceso")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
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
        valores = (
            persona.rut, persona.dv, persona.calle,
            persona.nombrePersona, persona.clave,
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
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
        query = """
            INSERT INTO formulario
                (descripcion, fechaInicio, idPersona, idCesfam, idHospital, idEstado, prioridadClinica)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
        """
        valores = (
            formulario.descripcion, formulario.fechaInicio,
            formulario.idPersona, formulario.idCesfam,
            formulario.idHospital, 1, formulario.prioridad
        )
        cursor.execute(query, valores)
        conexion.commit()
        return {"codigo": 1, "mensaje": "Éxito para ingresar Formulario"}

    except Exception as e:
        if conexion:
            conexion.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.post("/acceso", status_code=201)
def creaAcceso(acceso: accesoEntrada):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        cursor = conexion.cursor(dictionary=True)
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

    except Exception as e:
        if conexion:
            conexion.rollback()
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
                (SELECT GROUP_CONCAT(pc.contactos SEPARATOR ';')
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
                   c.nombreComuna,
                   h.nombreHospital,
                   e.nombreEstado,
                   f.prioridadClinica
            FROM formulario f
            LEFT JOIN persona p ON f.idPersona = p.idPersona
            LEFT JOIN comuna c ON f.idCesfam = c.idComuna
            LEFT JOIN hospital h ON f.idHospital = h.idHospital
            LEFT JOIN estados e ON f.idEstado = e.idEstado
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
            if prioridad_norm not in ("alta", "media", "baja"):
                raise HTTPException(
                    status_code=400,
                    detail="prioridad debe ser 'alta', 'media', 'baja' o 'todas'"
                )
            condiciones.append("f.prioridadClinica = %s")
            filtro.append(prioridad_norm)

        if condiciones:
            query += " WHERE " + " AND ".join(condiciones)

        cursor.execute(query, tuple(filtro))
        return cursor.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


@app.get("/Acceso/{rol}/{persona}/{cesfam}/{hospital}")
def obtieneAccesos(rol: int, persona: int, cesfam: int, hospital: int):
    conexion = None
    cursor = None
    try:
        conexion = get_conexion()
        query = """
            SELECT
                a.Activo AS activo,
                CASE
                    WHEN a.idCesfam != 0 THEN a.idCesfam
                    ELSE a.idHospital
                END AS idCentro,
                CASE
                    WHEN a.idCesfam != 0 THEN c.nombreCesfam
                    ELSE h.nombreHospital
                END AS nombreCentro,
                CASE
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
        condiciones = []
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()