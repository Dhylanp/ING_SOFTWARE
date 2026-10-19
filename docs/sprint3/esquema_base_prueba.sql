-- Esquema completo (incluye los cambios del Sprint 3) + datos mínimos de prueba.
-- La estructura es copia exacta (SHOW CREATE TABLE) de la base de Railway del equipo, leída el 2026-10-19
-- (MySQL 9.7): prioridadClinica es INT 1-10, persona tiene fechaNac e idComuna, y hay claves foráneas.
-- Solo para levantar una base local de prueba con la misma estructura que Railway.
-- NO ejecutar en producción: la base de Railway ya tiene estas tablas.
-- Usuarios de prueba: RUT 11111111 (Admin), 22222222 (Externo), 12345678 (Paciente); clave "Clave1234".
SET NAMES utf8mb4;

CREATE TABLE `region` (
  `idRegion` int NOT NULL AUTO_INCREMENT,
  `nombreRegion` varchar(50) NOT NULL,
  PRIMARY KEY (`idRegion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `comuna` (
  `idComuna` int NOT NULL AUTO_INCREMENT,
  `nombreComuna` varchar(50) NOT NULL,
  `idRegion` int NOT NULL,
  PRIMARY KEY (`idComuna`),
  KEY `idRegion` (`idRegion`),
  CONSTRAINT `comuna_ibfk_1` FOREIGN KEY (`idRegion`) REFERENCES `region` (`idRegion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cesfam` (
  `idCesfam` int NOT NULL AUTO_INCREMENT,
  `nombreCesfam` varchar(150) NOT NULL,
  `calle` varchar(50) NOT NULL,
  `idComuna` int NOT NULL,
  `correo` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`idCesfam`),
  KEY `idComuna` (`idComuna`),
  CONSTRAINT `cesfam_ibfk_1` FOREIGN KEY (`idComuna`) REFERENCES `comuna` (`idComuna`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `hospital` (
  `idHospital` int NOT NULL AUTO_INCREMENT,
  `nombreHospital` varchar(150) NOT NULL,
  `calle` varchar(50) NOT NULL,
  `idComuna` int NOT NULL,
  PRIMARY KEY (`idHospital`),
  KEY `idComuna` (`idComuna`),
  CONSTRAINT `hospital_ibfk_1` FOREIGN KEY (`idComuna`) REFERENCES `comuna` (`idComuna`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `persona` (
  `idPersona` int NOT NULL AUTO_INCREMENT,
  `rut` int NOT NULL,
  `calle` varchar(50) NOT NULL,
  `dv` char(1) NOT NULL,
  `nombrePersona` varchar(50) NOT NULL,
  `clave` varchar(100) NOT NULL,
  `fechaNac` date NOT NULL,
  `idComuna` int NOT NULL,
  PRIMARY KEY (`idPersona`),
  UNIQUE KEY `rut` (`rut`),
  KEY `idComuna` (`idComuna`),
  CONSTRAINT `persona_ibfk_1` FOREIGN KEY (`idComuna`) REFERENCES `comuna` (`idComuna`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `persona_contactos` (
  `contactos` int NOT NULL,
  `idPersona` int NOT NULL,
  `tipo` char(1) NOT NULL DEFAULT 'P',
  PRIMARY KEY (`contactos`,`idPersona`),
  KEY `id_Persona` (`idPersona`),
  CONSTRAINT `persona_contactos_ibfk_1` FOREIGN KEY (`idPersona`) REFERENCES `persona` (`idPersona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `persona_correos` (
  `correos` varchar(50) NOT NULL,
  `idPersona` int NOT NULL,
  PRIMARY KEY (`correos`,`idPersona`),
  KEY `id_Persona` (`idPersona`),
  CONSTRAINT `persona_correos_ibfk_1` FOREIGN KEY (`idPersona`) REFERENCES `persona` (`idPersona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rol` (
  `idRol` int NOT NULL AUTO_INCREMENT,
  `nombreRol` varchar(50) NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  PRIMARY KEY (`idRol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `acceso` (
  `Activo` char(1) NOT NULL,
  `idCesfam` int NOT NULL,
  `idHospital` int NOT NULL,
  `idPersona` int NOT NULL,
  `idRol` int NOT NULL,
  PRIMARY KEY (`idPersona`,`idRol`),
  KEY `idRol` (`idRol`),
  CONSTRAINT `acceso_ibfk_1` FOREIGN KEY (`idPersona`) REFERENCES `persona` (`idPersona`),
  CONSTRAINT `acceso_ibfk_2` FOREIGN KEY (`idRol`) REFERENCES `rol` (`idRol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `estados` (
  `idEstado` int NOT NULL AUTO_INCREMENT,
  `nombreEstado` varchar(50) NOT NULL,
  PRIMARY KEY (`idEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `especialidad` (
  `idEspecialidad` int NOT NULL AUTO_INCREMENT,
  `nombreEspecialidad` varchar(100) NOT NULL,
  PRIMARY KEY (`idEspecialidad`),
  UNIQUE KEY `nombreEspecialidad` (`nombreEspecialidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `formulario` (
  `idFormulario` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(200) NOT NULL,
  `fechaInicio` date NOT NULL,
  `idPersona` int NOT NULL,
  `idCesfam` int NOT NULL,
  `idHospital` int NOT NULL,
  `idEstado` int NOT NULL,
  `prioridadClinica` int DEFAULT '1',
  `idEspecialidad` int DEFAULT NULL,
  `motivoDevolucion` varchar(300) DEFAULT NULL,
  `observacionDevolucion` varchar(500) DEFAULT NULL,
  `fechaDevolucion` datetime DEFAULT NULL,
  `alertaRevisada` tinyint(1) NOT NULL DEFAULT '1',
  `causalCierre` varchar(30) DEFAULT NULL,
  `fechaCierre` date DEFAULT NULL,
  `fechaCita` datetime DEFAULT NULL,
  `centroCita` varchar(120) DEFAULT NULL,
  `uuidLocal` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`idFormulario`),
  UNIQUE KEY `uq_formulario_uuid` (`uuidLocal`),
  KEY `id_Persona` (`idPersona`),
  KEY `idCesfam` (`idCesfam`),
  KEY `idHospital` (`idHospital`),
  KEY `idEstado` (`idEstado`),
  KEY `fk_formulario_especialidad` (`idEspecialidad`),
  CONSTRAINT `fk_formulario_especialidad` FOREIGN KEY (`idEspecialidad`) REFERENCES `especialidad` (`idEspecialidad`),
  CONSTRAINT `formulario_ibfk_1` FOREIGN KEY (`idPersona`) REFERENCES `persona` (`idPersona`),
  CONSTRAINT `formulario_ibfk_2` FOREIGN KEY (`idCesfam`) REFERENCES `cesfam` (`idCesfam`),
  CONSTRAINT `formulario_ibfk_3` FOREIGN KEY (`idHospital`) REFERENCES `hospital` (`idHospital`),
  CONSTRAINT `formulario_ibfk_4` FOREIGN KEY (`idEstado`) REFERENCES `estados` (`idEstado`),
  CONSTRAINT `formulario_chk_1` CHECK (((`prioridadClinica` >= 1) and (`prioridadClinica` <= 10)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `formulario_documento` (
  `idDocumento` int NOT NULL AUTO_INCREMENT,
  `idFormulario` int NOT NULL,
  `nombreArchivo` varchar(255) NOT NULL,
  `tipoMime` varchar(100) NOT NULL,
  `tamanoBytes` int NOT NULL,
  `contenido` longblob NOT NULL,
  `fechaSubida` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idDocumento`),
  KEY `fk_documento_formulario` (`idFormulario`),
  CONSTRAINT `fk_documento_formulario` FOREIGN KEY (`idFormulario`) REFERENCES `formulario` (`idFormulario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `formulario_observacion` (
  `Observacion` varchar(200) NOT NULL,
  `idFormulario` int NOT NULL,
  PRIMARY KEY (`Observacion`,`idFormulario`),
  KEY `idFormulario` (`idFormulario`),
  CONSTRAINT `formulario_observacion_ibfk_1` FOREIGN KEY (`idFormulario`) REFERENCES `formulario` (`idFormulario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `formulario_historial` (
  `idHistorial` int NOT NULL AUTO_INCREMENT,
  `idFormulario` int NOT NULL,
  `idEstadoAnterior` int DEFAULT NULL,
  `idEstadoNuevo` int NOT NULL,
  `idPersona` int DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `comentario` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`idHistorial`),
  KEY `idx_hist_formulario` (`idFormulario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notificacion_correo` (
  `idNotificacion` int NOT NULL AUTO_INCREMENT,
  `idFormulario` int NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `destinatario` varchar(100) NOT NULL,
  `asunto` varchar(200) NOT NULL,
  `cuerpo` text NOT NULL,
  `estadoEnvio` varchar(20) NOT NULL,
  `detalle` varchar(300) DEFAULT NULL,
  `fecha` datetime NOT NULL,
  PRIMARY KEY (`idNotificacion`),
  KEY `idx_notif_formulario` (`idFormulario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Catálogos iguales a producción.
INSERT INTO estados VALUES (1,'Registrada'),(2,'En lista de espera'),(3,'Devuelta'),(4,'Tramitada'),(5,'Agendada'),(6,'Finalizada');
INSERT INTO rol VALUES
  (1,'Admin','Administra Cesfam y envia Formularios'),
  (2,'Externo','Administra Hospital y reenvia Formularios'),
  (3,'Usuario','Visualiza y administra sus datos y Formularios'),
  (4,'Gestionador de Roles','Acceso a la pantalla de Gestionar Roles');
INSERT INTO region VALUES (13,'Metropolitana de Santiago');
INSERT INTO comuna VALUES (1,'Santiago',13);
INSERT INTO cesfam (nombreCesfam, calle, idComuna) VALUES ('CESFAM Norte', 'Calle 1', 1);
INSERT INTO hospital (nombreHospital, calle, idComuna) VALUES ('Hospital Uno', 'Calle 2', 1);
INSERT INTO especialidad (nombreEspecialidad) VALUES ('Cardiología');

-- Clave "Clave1234" (bcrypt) para los tres usuarios.
INSERT INTO persona (idPersona, rut, calle, dv, nombrePersona, clave, fechaNac, idComuna) VALUES
  (1, 11111111, 'Calle 3', '1', 'Admin CESFAM',    '$2b$12$u003NR0Be7KwjNJydGqOf.N7FmqTawotdyqavfWmnFkLXeW5kwhlK', '1990-01-01', 1),
  (2, 22222222, 'Calle 4', '2', 'Especialista',    '$2b$12$u003NR0Be7KwjNJydGqOf.N7FmqTawotdyqavfWmnFkLXeW5kwhlK', '1985-05-05', 1),
  (3, 12345678, 'Calle 5', '5', 'Paciente Prueba', '$2b$12$u003NR0Be7KwjNJydGqOf.N7FmqTawotdyqavfWmnFkLXeW5kwhlK', '2000-02-02', 1);
INSERT INTO persona_correos VALUES ('paciente@example.com', 3);
INSERT INTO acceso VALUES ('S', 1, 0, 1, 1), ('S', 0, 1, 2, 2), ('S', 0, 0, 3, 3);
