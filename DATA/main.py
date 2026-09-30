from fastapi import FastAPI, HTTPException
import mysql.connector
from pydantic import BaseModel, Field
from datetime import date
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="API Lista de Espera")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Login(BaseModel):
    rut: int
    clave: str
    rol: int

class personaEntrada(BaseModel):
    rut : int
    dv: str = Field(min_lenght=1, max_length=1)
    nombrePersona : str
    clave : str
    fechaNac : date
    calle : str
    idComuna : int

class personaCompara(BaseModel):
    rut : int
    dv: str = Field(min_lenght=1, max_length=1)
    nombrePersona : str
    fechaNac : date
    calle : str
    idComuna : int
    numero : int
    correo : str = Field (min_length=6, max_length= 50)

class formularioEntrada(BaseModel):
    descripcion : str = Field(min_lenght = 0, max_length= 200)
    fechaInicio : date
    idPersona : int
    idCesfam : int
    idHospital : int
    prioridad : int

class accesoEntrada(BaseModel):
    idCesfam : int
    idHospital : int
    idPersona : int
    idRol : int

try:
    conexion = mysql.connector.connect(
        host="localhost",          
        database="listasespera",  
        user="root",
        password="Marti142106!"
    )
    
    if conexion.is_connected():
        from fastapi.middleware.cors import CORSMiddleware

        #Inicio API
        @app.get("/")
        def inicio():
            return {"mensaje": "Bienvenido a la API de Lista de Espera"}

        #Login
        @app.post("/login")
        def Login(datos: Login):
            cursor = None

            try:
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

                raise HTTPException(
                    status_code=404,
                    detail="No se posee Acceso"
                )

            except HTTPException:
                raise

            except Exception as e:
                conexion.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=str(e)
                )

            finally:
                if cursor:
                    cursor.close()

        #Registrar Información
        @app.post("/persona", status_code=201)
        def creaPersona(persona: personaEntrada):
            cursor = None
            try:
                query_verificar = """
                    SELECT idPersona FROM persona WHERE rut = %s
                """
                cursor = conexion.cursor(dictionary=True)
                cursor.execute(query_verificar, (persona.rut,))
                resultado = cursor.fetchone()
                
                if resultado:
                    return {"codigo": 0, "mensaje": f"Ya existe un Usuario asignado a ese RUT"}

                query = """
                    INSERT INTO persona
                        (rut, dv, calle, nombrePersona, clave, fechaNac, idComuna)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor = conexion.cursor()
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
                valores_acceso = (
                    "S",
                    0,
                    0,
                    idPersona,
                    3, #Usuario
                )
                cursor.execute(query_acceso, valores_acceso)

                conexion.commit()

                return {"codigo": 1, "mensaje": f"Éxito para ingresar Persona y dar acceso de Usuario"}

            except Exception as e:
                conexion.rollback()
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()

        @app.post("/formulario", status_code=201)
        def creaFormulario(formulario: formularioEntrada):
            cursor = None
            try:
                query = """
                    INSERT INTO formulario
                        (descripcion, fechaInicio, idPersona, idCesfam, idHospital, idEstado, prioridadClinica)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor = conexion.cursor(dictionary=True)
                valores = (
                    formulario.descripcion, formulario.fechaInicio,
                    formulario.idPersona, formulario.idCesfam,
                    formulario.idHospital, 1, formulario.prioridad
                )
                cursor.execute(query, valores)
                conexion.commit()

                return {"codigo": 1, "mensaje": "Éxito para ingresar Formulario"}

            except Exception as e:
                conexion.rollback()
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()

        @app.post("/acceso", status_code=201)
        def creaAcceso(acceso: accesoEntrada):
            cursor = None
            try:
                query = """
                    INSERT INTO acceso
                        (Activo, idCesfam, idHospital, idPersona, idRol)
                    VALUES
                        (%s, %s, %s, %s, %s)
                """
                cursor = conexion.cursor(dictionary=True)
                valores = (
                    'S', acceso.idCesfam,
                    acceso.idHospital, acceso.idPersona,
                    acceso.idRol
                )
                cursor.execute(query, valores)
                conexion.commit()

                return {"codigo": 1, "mensaje": "Éxito para permitir Acceso"}

            except Exception as e:
                conexion.rollback()
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()

        #Obtener Información
        @app.get("/region")
        def obtieneRegiones():
            cursor = None
            try:
                query = """
                    SELECT idRegion, nombreRegion
                    FROM region
                """
                cursor = conexion.cursor(dictionary=True)
                cursor.execute(query)
                respuesta = cursor.fetchall()

                if len(respuesta) != 0:
                    return respuesta
                else:
                    raise HTTPException(
                        status_code=404, detail="No se encontraron comunas para esta región"
                    )

            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()

        @app.get("/comuna/{region}")
        def obtieneComunas(region : int):
            cursor = None
            try:
                query = """
                    SELECT idComuna, nombreComuna
                    FROM comuna
                """
                cursor = conexion.cursor(dictionary=True)
                if region != 0:
                    query += " WHERE idRegion = %s"
                    cursor.execute(query, (region,))
                else:
                    cursor.execute(query)
                respuesta = cursor.fetchall()

                if len(respuesta) != 0:
                    return respuesta
                else:
                    raise HTTPException(
                        status_code=404, detail="No se encontraron comunas para esta región"
                    )

            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()

        @app.get("/hospital/{comuna}")
        def obtieneHospitales(comuna : int):
            cursor = None
            try:
                query = """
                    SELECT idHospital, nombreHospital, calle, idComuna
                    FROM hospital
                """
                cursor = conexion.cursor(dictionary=True)
                if comuna != 0:
                    query += "WHERE idComuna = %s"
                    cursor.execute(query, (comuna,))
                else:
                    cursor.execute(query)
                respuesta = cursor.fetchall()

                if len(respuesta) != 0:
                    return respuesta
                else:
                    raise HTTPException(
                        status_code=404, detail="No se encontraron hospitales para esta comuna"
                    )

            except Exception as e:
                conexion.rollback()
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()

        @app.get("/cesfam/{comuna}")
        def obtieneCesfams(comuna : int):
            cursor = None
            try:
                query = """
                    SELECT idCesfam, nombreCesfam, calle
                    FROM cesfam
                """
                cursor = conexion.cursor(dictionary=True)
                if comuna != 0:
                    query += "WHERE idComuna = %s"
                    cursor.execute(query, (comuna,))
                else:
                    cursor.execute(query)
                respuesta = cursor.fetchall()

                if len(respuesta) != 0:
                    return respuesta
                else:   
                    raise HTTPException(
                        status_code=404, detail="No se encontraron CESFAMs para esta comuna"
                    )

            except Exception as e:
                conexion.rollback()
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()
        
        @app.get("/contactos/{persona}")
        def obtieneDatosContacto(persona : int):
            cursor = None
            try:
                query = """
                SELECT 
                    p.idPersona,
                    c.nombreComuna AS Comuna,
                    r.nombreRegion AS Region,
                    (SELECT GROUP_CONCAT(pc.contactos SEPARATOR ';') 
                    FROM persona_contactos pc 
                    WHERE pc.idPersona = p.idPersona) AS Contactos,
                    (SELECT GROUP_CONCAT(pcor.correos SEPARATOR ';') 
                    FROM persona_correos pcor 
                    WHERE pcor.idPersona = p.idPersona) AS Correos
                FROM 
                    persona p
                LEFT JOIN 
                    comuna c ON p.idComuna = c.idComuna
                LEFT JOIN 
                    region r ON c.idRegion = r.idRegion
                WHERE 
                    p.idPersona = %s;
                """
                cursor = conexion.cursor(dictionary=True)
                cursor.execute(query, (persona,))
                respuesta = cursor.fetchall()

                if len(respuesta) != 0:
                    return respuesta
                else:   
                    raise HTTPException(
                        status_code=404, detail="No se encontraron CESFAMs para esta comuna"
                    )

            except Exception as e:
                conexion.rollback()
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()

        @app.get("/comparaDatos/{rut}/{dv}/{nombrePersona}/{fechaNac}/{calle}/{idComuna}/{numero}/{correo}")
        def comparaDatosPersona(rut: int, dv : str, nombrePersona : str, fechaNac : date, calle : str, idComuna : int, numero : int, correo : str):
            cursor = None

            try:
                query = """
                    SELECT
                        p.rut,
                        p.dv,
                        p.nombrePersona,
                        p.fechaNac,
                        p.calle,
                        p.idComuna,

                        EXISTS (
                            SELECT 1
                            FROM persona_contactos pc
                            WHERE pc.idPersona = p.idPersona
                            AND pc.contactos = %s
                        ) AS telefonoCoincide,

                        EXISTS (
                            SELECT 1
                            FROM persona_correos pco
                            WHERE pco.idPersona = p.idPersona
                            AND pco.correos = %s
                        ) AS correoCoincide

                    FROM persona p
                    WHERE p.rut = %s
                """

                valores = (
                    numero,
                    correo,
                    rut
                )

                cursor = conexion.cursor(dictionary=True)
                cursor.execute(query, valores)
                respuesta = cursor.fetchone()

                if respuesta is None:
                    raise HTTPException(
                        status_code=404,
                        detail="No se encontró una persona con el RUT indicado"
                    )

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
                    return {
                        "codigo": 1,
                        "mensaje": "Todos los datos coinciden"
                    }

                return {
                    "codigo": 1,
                    "mensaje": "Los siguientes datos no coinciden: " +
                            ", ".join(datosNoCoinciden)
                }

            except HTTPException:
                raise

            except Exception as e:
                conexion.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=str(e)
                )

            finally:
                if cursor:
                    cursor.close()

        @app.get("/formulario/{persona}/{cesfam}/{hospital}/{estado}/{prioridad}")
        def obtieneFormularios(persona: int, cesfam: int, hospital: int, estado: int, prioridad: int):
            cursor = None
            try:
                query = """
                    SELECT idFormulario, descripcion, fechaInicio, idPersona, idCesfam, idHospital, idEstado
                    FROM formulario
                """
                cursor = conexion.cursor(dictionary=True)
                condiciones = []
                filtro = []

                if persona != 0:
                    condiciones.append("idPersona = %s")
                    filtro.append(persona)

                if cesfam != 0:
                    condiciones.append("idCesfam = %s")
                    filtro.append(cesfam)

                if hospital != 0:
                    condiciones.append("idHospital = %s")
                    filtro.append(hospital)

                if estado != 0:
                    condiciones.append("idEstado = %s")
                    filtro.append(estado)

                if prioridad != 0:
                    condiciones.append("prioridadClinica = %s")
                    filtro.append(prioridad)

                if condiciones:
                    query += " WHERE " + " AND ".join(condiciones)

                cursor.execute(query, tuple(filtro))
                respuesta = cursor.fetchall()

                return respuesta  # [] si no hay resultados, 200 siempre

            except HTTPException:
                raise  # deja pasar las HTTPException tal cual
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

            finally:
                if cursor:
                    cursor.close()
        
        @app.get("/Acceso/{rol}/{persona}/{cesfam}/{hospital}")
        def obtieneAccesos(rol: int, persona: int, cesfam: int, hospital: int):
            cursor = None
            try:
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

                    LEFT JOIN cesfam c
                        ON a.idCesfam = c.idCesfam

                    LEFT JOIN hospital h
                        ON a.idHospital = h.idHospital

                    INNER JOIN persona p
                        ON a.idPersona = p.idPersona
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

                respuesta = cursor.fetchall()

                return respuesta

            except HTTPException:
                raise

            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=str(e)
                )

            finally:
                if cursor:
                    cursor.close()

except mysql.connector.Error as error:
    print(f"Error al conectar a MySQL: {error}")