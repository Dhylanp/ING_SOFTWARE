"""
Lógica de negocio del flujo de interconsultas que NO depende de FastAPI ni de
la base de datos, para poder probarla de forma aislada (ver DATA/tests).

Contiene:
  - Estados del flujo.
  - Utilidades de fecha.
"""
from __future__ import annotations

from datetime import datetime

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
