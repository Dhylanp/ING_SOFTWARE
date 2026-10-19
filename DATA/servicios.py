"""
Lógica de negocio del flujo de interconsultas que NO depende de FastAPI ni de
la base de datos, para poder probarla de forma aislada (ver DATA/tests).

Contiene:
  - Estados del flujo y transiciones permitidas (HU05B, HU09, HU23).
  - Causales de cierre (HU09).
  - Plantillas de correo por etapa (HU15, HU23).
  - Envío de correo por SMTP, con modo "simulado" si no hay SMTP configurado.
  - Utilidades de fecha.
"""
from __future__ import annotations

import logging
import os
import re
import smtplib
from datetime import datetime
from email.message import EmailMessage

logger = logging.getLogger("api-lista-espera")

# ----------------------------------------------------------------------
# Estados del flujo (tabla `estados`)
# ----------------------------------------------------------------------
E_REGISTRADA = 1      # Emitida / Registrada
E_LISTA_ESPERA = 2    # Aceptada / En lista de espera
E_DEVUELTA = 3
E_TRAMITADA = 4       # Corregida y reenviada
E_AGENDADA = 5        # Con hora médica asignada
E_FINALIZADA = 6

NOMBRES_ESTADO = {
    E_REGISTRADA: "Registrada",
    E_LISTA_ESPERA: "En lista de espera",
    E_DEVUELTA: "Devuelta",
    E_TRAMITADA: "Tramitada",
    E_AGENDADA: "Agendada",
    E_FINALIZADA: "Finalizada",
}

# acción -> (estados desde los que se puede ejecutar, estado resultante)
TRANSICIONES = {
    "aceptar": ({E_REGISTRADA, E_TRAMITADA}, E_LISTA_ESPERA),
    "devolver": ({E_REGISTRADA, E_TRAMITADA}, E_DEVUELTA),
    "reenviar": ({E_DEVUELTA}, E_TRAMITADA),
    "cerrar": (
        {E_REGISTRADA, E_LISTA_ESPERA, E_DEVUELTA, E_TRAMITADA, E_AGENDADA},
        E_FINALIZADA,
    ),
}

CAUSALES_CIERRE = (
    "Atendido",
    "Inasistencia",
    "Rechazo",
    "Fallecimiento",
    "Retiro voluntario",
)


def valida_transicion(accion: str, estado_actual: int) -> int:
    """Devuelve el estado destino o lanza ValueError con un mensaje legible."""
    if accion not in TRANSICIONES:
        raise ValueError(f"Acción desconocida: {accion}")
    origenes, destino = TRANSICIONES[accion]
    if int(estado_actual) not in origenes:
        actual = NOMBRES_ESTADO.get(int(estado_actual), str(estado_actual))
        raise ValueError(
            f"No se puede ejecutar '{accion}' sobre una interconsulta en estado '{actual}'"
        )
    return destino


def normaliza_causal(causal: str | None) -> str:
    """Valida que la causal pertenezca a la lista oficial (HU09)."""
    if causal is None or not str(causal).strip():
        raise ValueError("La causal de cierre es obligatoria")
    valor = " ".join(str(causal).split())
    for oficial in CAUSALES_CIERRE:
        if oficial.lower() == valor.lower():
            return oficial
    raise ValueError(
        "Causal de cierre inválida. Opciones: " + ", ".join(CAUSALES_CIERRE)
    )


# ----------------------------------------------------------------------
# Fechas
# ----------------------------------------------------------------------
def iso_utc(valor) -> str | None:
    """Serializa un DATETIME guardado en UTC (naive) como ISO-8601 con 'Z'."""
    if valor is None:
        return None
    if isinstance(valor, datetime):
        return valor.replace(tzinfo=None).isoformat() + "Z"
    texto = str(valor).strip().replace(" ", "T")
    return texto if texto.endswith("Z") else texto + "Z"


# ----------------------------------------------------------------------
# Plantillas de correo (HU15 / HU23)
# ----------------------------------------------------------------------
# Por confidencialidad los correos NUNCA incluyen datos clínicos
# (descripción, motivo de devolución, diagnóstico); solo el N° de caso y la etapa.
PIE = (
    "\n\nEste es un mensaje automático del Sistema de Gestión de Interconsultas. "
    "No incluye datos clínicos por razones de confidencialidad. "
    "Si tiene dudas, comuníquese con su CESFAM."
)


def correo_paciente(
    id_estado: int,
    nombre: str,
    id_formulario: int,
    especialidad: str | None = None,
    hospital: str | None = None,
    causal: str | None = None,
) -> tuple[str, str]:
    """Plantilla predefinida según la etapa del flujo (HU15)."""
    esp = f" de {especialidad}" if especialidad else ""
    saludo = f"Estimado/a {nombre}:\n\n"
    caso = f"N° de interconsulta: #{id_formulario}"

    if id_estado == E_REGISTRADA:
        asunto = f"Interconsulta #{id_formulario}: registrada"
        cuerpo = (
            saludo
            + f"Su interconsulta{esp} fue registrada y será enviada a la red de derivación.\n{caso}"
        )
    elif id_estado == E_TRAMITADA:
        asunto = f"Interconsulta #{id_formulario}: en trámite"
        cuerpo = (
            saludo
            + f"Su interconsulta{esp} fue enviada nuevamente al hospital para su revisión.\n{caso}"
        )
    elif id_estado == E_LISTA_ESPERA:
        asunto = f"Interconsulta #{id_formulario}: aceptada, en lista de espera"
        cuerpo = (
            saludo
            + f"Su interconsulta{esp} fue aceptada por el hospital"
            + (f" ({hospital})" if hospital else "")
            + " y quedó en lista de espera. Le avisaremos cuando se le asigne una hora."
            + f"\n{caso}"
        )
    elif id_estado == E_DEVUELTA:
        asunto = f"Interconsulta #{id_formulario}: requiere gestión administrativa"
        cuerpo = (
            saludo
            + f"Su interconsulta{esp} requiere una corrección administrativa en su CESFAM. "
            "El equipo del CESFAM la gestionará y le informará cualquier novedad."
            + f"\n{caso}"
        )
    elif id_estado == E_FINALIZADA:
        asunto = f"Interconsulta #{id_formulario}: finalizada"
        cuerpo = (
            saludo
            + f"Su interconsulta{esp} fue cerrada"
            + (f" (motivo: {causal})" if causal else "")
            + f".\n{caso}"
        )
    else:
        asunto = f"Interconsulta #{id_formulario}: cambio de estado"
        cuerpo = saludo + f"Su interconsulta cambió de estado.\n{caso}"

    return asunto, cuerpo + PIE


def correo_cesfam(
    id_estado: int,
    id_formulario: int,
    nombre_cesfam: str | None = None,
    hospital: str | None = None,
) -> tuple[str, str]:
    """Aviso al CESFAM de origen cuando el especialista acepta o devuelve (HU23)."""
    destino = f"Equipo de {nombre_cesfam}" if nombre_cesfam else "Equipo del CESFAM"
    caso = f"Interconsulta #{id_formulario}"
    origen = f" por {hospital}" if hospital else " por el hospital"
    if id_estado == E_LISTA_ESPERA:
        asunto = f"{caso}: ACEPTADA"
        cuerpo = f"{destino}:\n\nLa {caso} fue aceptada{origen} y quedó en lista de espera."
    elif id_estado == E_DEVUELTA:
        asunto = f"{caso}: DEVUELTA"
        cuerpo = (
            f"{destino}:\n\nLa {caso} fue devuelta{origen}. "
            "Ingrese al sistema, sección «Interconsultas devueltas», para ver el motivo, "
            "corregirla y reenviarla."
        )
    else:
        nombre = NOMBRES_ESTADO.get(id_estado, str(id_estado))
        asunto = f"{caso}: cambio de estado a {nombre}"
        cuerpo = f"{destino}:\n\nLa {caso} cambió al estado «{nombre}»."
    return asunto, cuerpo + PIE


# ----------------------------------------------------------------------
# Envío de correo
# ----------------------------------------------------------------------
CORREO_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def smtp_configurado() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def enviar_correo(destinatario: str, asunto: str, cuerpo: str) -> tuple[str, str]:
    """
    Envía un correo. Devuelve (estado, detalle) con estado en
    {'enviado', 'simulado', 'error', 'sin_destinatario'}.
    Nunca lanza excepciones: una falla de correo no debe bloquear el flujo clínico.
    """
    if not destinatario or not CORREO_REGEX.match(destinatario):
        return "sin_destinatario", "No hay un correo válido registrado"

    if not smtp_configurado():
        logger.info("[correo simulado] a=%s asunto=%s", destinatario, asunto)
        return "simulado", "SMTP no configurado (SMTP_HOST vacío)"

    try:
        msg = EmailMessage()
        msg["From"] = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or "no-responder@localhost"
        msg["To"] = destinatario
        msg["Subject"] = asunto
        msg.set_content(cuerpo)

        puerto = int(os.getenv("SMTP_PORT", "587"))
        usar_ssl = os.getenv("SMTP_SSL", "0") == "1"
        clase = smtplib.SMTP_SSL if usar_ssl else smtplib.SMTP
        with clase(os.getenv("SMTP_HOST"), puerto, timeout=10) as servidor:
            if not usar_ssl and os.getenv("SMTP_TLS", "1") == "1":
                servidor.starttls()
            if os.getenv("SMTP_USER"):
                servidor.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD", ""))
            servidor.send_message(msg)
        return "enviado", "OK"
    except Exception as exc:  # noqa: BLE001 - se registra y se informa, no se propaga
        logger.warning("Fallo al enviar correo a %s: %s", destinatario, exc)
        return "error", str(exc)[:290]
