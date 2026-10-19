-- ============================================================================
-- Sprint 3: flujo de revisión, trazabilidad, alertas, notificaciones y sync
-- ----------------------------------------------------------------------------
-- La API aplica esto AUTOMÁTICAMENTE al arrancar (función asegura_esquema en
-- DATA/main.py; se desactiva con AUTO_MIGRAR=0). Este archivo existe para
-- quien prefiera ejecutarlo a mano en MySQL (Railway). Ejecutar UNA sola vez:
-- MySQL no soporta "ADD COLUMN IF NOT EXISTS".
-- ============================================================================

-- 1) Estados del flujo (los ids 1-3 ya existían)
UPDATE estados SET nombreEstado = 'Tramitada' WHERE idEstado = 4 AND nombreEstado = 'Enviada';
INSERT INTO estados (idEstado, nombreEstado) VALUES (5, 'Agendada');
INSERT INTO estados (idEstado, nombreEstado) VALUES (6, 'Finalizada');

-- 2) Nuevas columnas en formulario
ALTER TABLE formulario
    ADD COLUMN motivoDevolucion      VARCHAR(300) NULL,      -- HU05A / HU23
    ADD COLUMN observacionDevolucion VARCHAR(500) NULL,      -- HU05A
    ADD COLUMN fechaDevolucion       DATETIME     NULL,      -- HU05A (UTC)
    ADD COLUMN alertaRevisada        TINYINT(1)   NOT NULL DEFAULT 1,  -- HU16
    ADD COLUMN causalCierre          VARCHAR(30)  NULL,      -- HU09
    ADD COLUMN fechaCierre           DATE         NULL,      -- HU09
    ADD COLUMN fechaCita             DATETIME     NULL,      -- HU17
    ADD COLUMN centroCita            VARCHAR(120) NULL,      -- HU17
    ADD COLUMN uuidLocal             VARCHAR(40)  NULL;      -- HU19/HU21 (idempotencia)
CREATE UNIQUE INDEX uq_formulario_uuid ON formulario (uuidLocal);

-- 3) Correo del CESFAM para avisarle aceptaciones/devoluciones (HU23)
ALTER TABLE cesfam ADD COLUMN correo VARCHAR(100) NULL;
-- Ejemplo: UPDATE cesfam SET correo = 'cesfam.norte@ejemplo.cl' WHERE idCesfam = 1;

-- 4) Historial de estados (HU07)
CREATE TABLE IF NOT EXISTS formulario_historial (
    idHistorial      INT AUTO_INCREMENT PRIMARY KEY,
    idFormulario     INT          NOT NULL,
    idEstadoAnterior INT          NULL,
    idEstadoNuevo    INT          NOT NULL,
    idPersona        INT          NULL,      -- usuario responsable
    fecha            DATETIME     NOT NULL,  -- UTC
    comentario       VARCHAR(500) NULL,
    INDEX idx_hist_formulario (idFormulario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) Bitácora de correos (HU15 / HU17 / HU23)
CREATE TABLE IF NOT EXISTS notificacion_correo (
    idNotificacion INT AUTO_INCREMENT PRIMARY KEY,
    idFormulario   INT          NOT NULL,
    tipo           VARCHAR(20)  NOT NULL,   -- paciente | cesfam
    destinatario   VARCHAR(100) NOT NULL,
    asunto         VARCHAR(200) NOT NULL,
    cuerpo         TEXT         NOT NULL,
    estadoEnvio    VARCHAR(20)  NOT NULL,   -- enviado | simulado | error | sin_destinatario
    detalle        VARCHAR(300) NULL,
    fecha          DATETIME     NOT NULL,
    INDEX idx_notif_formulario (idFormulario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) Historial inicial para las interconsultas que ya existían
INSERT INTO formulario_historial (idFormulario, idEstadoAnterior, idEstadoNuevo, idPersona, fecha, comentario)
SELECT f.idFormulario, NULL, f.idEstado, NULL, NOW(), 'Estado inicial (migración)'
FROM formulario f
WHERE NOT EXISTS (SELECT 1 FROM formulario_historial h WHERE h.idFormulario = f.idFormulario);
