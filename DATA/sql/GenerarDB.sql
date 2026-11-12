-- SCRIPT 1: crea TODAS las tablas (16) + datos de Regiones, Comunas, Roles, Cesfam, Hospital, Estados y Especialidades + usuario administrador de roles
-- Uso (PowerShell): mysql -u USUARIO -p NOMBRE_BD -e "source DATA/sql/GenerarDB.sql"
-- Uso (CMD o bash):  mysql -u USUARIO -p NOMBRE_BD < DATA/sql/GenerarDB.sql
-- ATENCION: borra las tablas si existen. Usar solo sobre una base nueva, nunca en produccion.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- ---- region ----
DROP TABLE IF EXISTS `region`;
CREATE TABLE `region` (
  `idRegion` int NOT NULL AUTO_INCREMENT,
  `nombreRegion` varchar(50) NOT NULL,
  PRIMARY KEY (`idRegion`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `region` VALUES (1,'Arica y Parinacota'),(2,'Tarapacá'),(3,'Antofagasta'),(4,'Atacama'),(5,'Coquimbo'),(6,'Valparaíso'),(7,'Metropolitana de Santiago'),(8,'Libertador General Bernardo O\'Higgins'),(9,'Maule'),(10,'Ñuble'),(11,'Biobío'),(12,'La Araucanía'),(13,'Los Ríos'),(14,'Los Lagos'),(15,'Aysén del General Carlos Ibáñez del Campo'),(16,'Magallanes y de la Antártica Chilena');

-- ---- comuna ----
DROP TABLE IF EXISTS `comuna`;
CREATE TABLE `comuna` (
  `idComuna` int NOT NULL AUTO_INCREMENT,
  `nombreComuna` varchar(50) NOT NULL,
  `idRegion` int NOT NULL,
  PRIMARY KEY (`idComuna`),
  KEY `idRegion` (`idRegion`),
  CONSTRAINT `comuna_ibfk_1` FOREIGN KEY (`idRegion`) REFERENCES `region` (`idRegion`)
) ENGINE=InnoDB AUTO_INCREMENT=344 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `comuna` VALUES (1,'Arica',1),(2,'Camarones',1),(3,'Putre',1),(4,'General Lagos',1),(5,'Iquique',2),(6,'Alto Hospicio',2),(7,'Pozo Almonte',2),(8,'Camiña',2),(9,'Colchane',2),(10,'Huara',2),(11,'Pica',2),(12,'Antofagasta',3),(13,'Mejillones',3),(14,'Sierra Gorda',3),(15,'Taltal',3),(16,'Calama',3),(17,'Ollagüe',3),(18,'San Pedro de Atacama',3),(19,'Tocopilla',3),(20,'María Elena',3),(21,'Copiapó',4),(22,'Caldera',4),(23,'Tierra Amarilla',4),(24,'Chañaral',4),(25,'Diego de Almagro',4),(26,'Vallenar',4),(27,'Alto del Carmen',4),(28,'Freirina',4),(29,'Huasco',4),(30,'La Serena',5),(31,'Coquimbo',5),(32,'Andacollo',5),(33,'La Higuera',5),(34,'Paiguano',5),(35,'Vicuña',5),(36,'Illapel',5),(37,'Canela',5),(38,'Los Vilos',5),(39,'Salamanca',5),(40,'Ovalle',5),(41,'Combarbalá',5),(42,'Monte Patria',5),(43,'Punitaqui',5),(44,'Río Hurtado',5),(45,'Valparaíso',6),(46,'Casablanca',6),(47,'Concón',6),(48,'Juan Fernández',6),(49,'Puchuncaví',6),(50,'Quintero',6),(51,'Viña del Mar',6),(52,'Isla de Pascua',6),(53,'Los Andes',6),(54,'Calle Larga',6),(55,'Rinconada',6),(56,'San Esteban',6),(57,'La Ligua',6),(58,'Cabildo',6),(59,'Papudo',6),(60,'Petorca',6),(61,'Zapallar',6),(62,'Quillota',6),(63,'Calera',6),(64,'Hijuelas',6),(65,'La Cruz',6),(66,'Nogales',6),(67,'San Antonio',6),(68,'Algarrobo',6),(69,'El Quisco',6),(70,'El Tabo',6),(71,'Santo Domingo',6),(72,'San Felipe',6),(73,'Catemu',6),(74,'Llaillay',6),(75,'Panquehue',6),(76,'Putaendo',6),(77,'Santa María',6),(78,'Quilpué',6),(79,'Limache',6),(80,'Olmué',6),(81,'Villa Alemana',6),(82,'Santiago',7),(83,'Cerrillos',7),(84,'Cerro Navia',7),(85,'Conchalí',7),(86,'El Bosque',7),(87,'Estación Central',7),(88,'Huechuraba',7),(89,'Independencia',7),(90,'La Cisterna',7),(91,'La Florida',7),(92,'La Granja',7),(93,'La Pintana',7),(94,'La Reina',7),(95,'Las Condes',7),(96,'Lo Barnechea',7),(97,'Lo Espejo',7),(98,'Lo Prado',7),(99,'Macul',7),(100,'Maipú',7),(101,'Ñuñoa',7),(102,'Pedro Aguirre Cerda',7),(103,'Peñalolén',7),(104,'Providencia',7),(105,'Pudahuel',7),(106,'Quilicura',7),(107,'Quinta Normal',7),(108,'Recoleta',7),(109,'Renca',7),(110,'San Joaquín',7),(111,'San Miguel',7),(112,'San Ramón',7),(113,'Vitacura',7),(114,'Puente Alto',7),(115,'Pirque',7),(116,'San José de Maipo',7),(117,'Colina',7),(118,'Lampa',7),(119,'Tiltil',7),(120,'San Bernardo',7),(121,'Buin',7),(122,'Calera de Tango',7),(123,'Paine',7),(124,'Melipilla',7),(125,'Alhué',7),(126,'Curacaví',7),(127,'María Pinto',7),(128,'San Pedro',7),(129,'Talagante',7),(130,'El Monte',7),(131,'Isla de Maipo',7),(132,'Padre Hurtado',7),(133,'Peñaflor',7),(134,'Rancagua',8),(135,'Codegua',8),(136,'Coinco',8),(137,'Coltauco',8),(138,'Doñihue',8),(139,'Graneros',8),(140,'Las Cabras',8),(141,'Machalí',8),(142,'Malloa',8),(143,'Mostazal',8),(144,'Olivar',8),(145,'Peumo',8),(146,'Pichidegua',8),(147,'Quinta de Tilcoco',8),(148,'Rengo',8),(149,'Requínoa',8),(150,'San Vicente',8),(151,'Pichilemu',8),(152,'La Estrella',8),(153,'Litueche',8),(154,'Marchihue',8),(155,'Navidad',8),(156,'Paredones',8),(157,'San Fernando',8),(158,'Chépica',8),(159,'Chimbarongo',8),(160,'Lolol',8),(161,'Nancagua',8),(162,'Palmilla',8),(163,'Peralillo',8),(164,'Placilla',8),(165,'Pumanque',8),(166,'Santa Cruz',8),(167,'Talca',9),(168,'Constitución',9),(169,'Curepto',9),(170,'Empedrado',9),(171,'Maule',9),(172,'Pelarco',9),(173,'Pencahue',9),(174,'Río Claro',9),(175,'San Clemente',9),(176,'San Rafael',9),(177,'Cauquenes',9),(178,'Chanco',9),(179,'Pelluhue',9),(180,'Curicó',9),(181,'Hualañé',9),(182,'Licantén',9),(183,'Molina',9),(184,'Rauco',9),(185,'Romeral',9),(186,'Sagrada Familia',9),(187,'Teno',9),(188,'Vichuquén',9),(189,'Linares',9),(190,'Colbún',9),(191,'Longaví',9),(192,'Parral',9),(193,'San Javier',9),(194,'Villa Alegre',9),(195,'Yerbas Buenas',9),(196,'Chillán',10),(197,'Bulnes',10),(198,'Cobquecura',10),(199,'Coelemu',10),(200,'Coihueco',10),(201,'Chillán Viejo',10),(202,'El Carmen',10),(203,'Ninhue',10),(204,'Ñiquén',10),(205,'Pemuco',10),(206,'Pinto',10),(207,'Portezuelo',10),(208,'Quillón',10),(209,'Quirihue',10),(210,'Ránquil',10),(211,'San Carlos',10),(212,'San Fabián',10),(213,'San Ignacio',10),(214,'San Nicolás',10),(215,'Treguaco',10),(216,'Yungay',10),(217,'Concepción',11),(218,'Coronel',11),(219,'Chiguayante',11),(220,'Florida',11),(221,'Hualqui',11),(222,'Lota',11),(223,'Penco',11),(224,'San Pedro de la Paz',11),(225,'Santa Juana',11),(226,'Talcahuano',11),(227,'Tomé',11),(228,'Hualpén',11),(229,'Lebu',11),(230,'Arauco',11),(231,'Cañete',11),(232,'Contulmo',11),(233,'Curanilahue',11),(234,'Los Álamos',11),(235,'Tirúa',11),(236,'Los Ángeles',11),(237,'Antuco',11),(238,'Cabrero',11),(239,'Laja',11),(240,'Mulchén',11),(241,'Nacimiento',11),(242,'Negrete',11),(243,'Quilleco',11),(244,'San Rosendo',11),(245,'Santa Bárbara',11),(246,'Tucapel',11),(247,'Yumbel',11),(248,'Alto Biobío',11),(249,'Temuco',12),(250,'Carahue',12),(251,'Cunco',12),(252,'Curarrehue',12),(253,'Freire',12),(254,'Galvarino',12),(255,'Gorbea',12),(256,'Lautaro',12),(257,'Loncoche',12),(258,'Melipeuco',12),(259,'Nueva Imperial',12),(260,'Padre Las Casas',12),(261,'Perquenco',12),(262,'Pitrufquén',12),(263,'Pucón',12),(264,'Saavedra',12),(265,'Teodoro Schmidt',12),(266,'Toltén',12),(267,'Vilcún',12),(268,'Villarrica',12),(269,'Cholchol',12),(270,'Angol',12),(271,'Collipulli',12),(272,'Curacautín',12),(273,'Ercilla',12),(274,'Lonquimay',12),(275,'Los Sauces',12),(276,'Lumaco',12),(277,'Purén',12),(278,'Renaico',12),(279,'Traiguén',12),(280,'Victoria',12),(281,'Valdivia',13),(282,'Corral',13),(283,'Lanco',13),(284,'Los Lagos',13),(285,'Máfil',13),(286,'Mariquina',13),(287,'Paillaco',13),(288,'Panguipulli',13),(289,'La Unión',13),(290,'Futrono',13),(291,'Lago Ranco',13),(292,'Río Bueno',13),(293,'Puerto Montt',14),(294,'Calbuco',14),(295,'Cochamó',14),(296,'Fresia',14),(297,'Frutillar',14),(298,'Los Muermos',14),(299,'Llanquihue',14),(300,'Maullín',14),(301,'Puerto Varas',14),(302,'Castro',14),(303,'Ancud',14),(304,'Chonchi',14),(305,'Curaco de Vélez',14),(306,'Dalcahue',14),(307,'Puqueldón',14),(308,'Queilén',14),(309,'Quellón',14),(310,'Quemchi',14),(311,'Quinchao',14),(312,'Osorno',14),(313,'Puerto Octay',14),(314,'Purranque',14),(315,'Puyehue',14),(316,'Río Negro',14),(317,'San Juan de la Costa',14),(318,'San Pablo',14),(319,'Chaitén',14),(320,'Futaleufú',14),(321,'Hualaihué',14),(322,'Palena',14),(323,'Coyhaique',15),(324,'Lago Verde',15),(325,'Aysén',15),(326,'Cisnes',15),(327,'Guaitecas',15),(328,'Cochrane',15),(329,'O\'Higgins',15),(330,'Tortel',15),(331,'Chile Chico',15),(332,'Río Ibáñez',15),(333,'Punta Arenas',16),(334,'Laguna Blanca',16),(335,'Río Verde',16),(336,'San Gregorio',16),(337,'Cabo de Hornos',16),(338,'Antártica',16),(339,'Porvenir',16),(340,'Primavera',16),(341,'Timaukel',16),(342,'Natales',16),(343,'Torres del Paine',16);

-- ---- rol ----
DROP TABLE IF EXISTS `rol`;
CREATE TABLE `rol` (
  `idRol` int NOT NULL AUTO_INCREMENT,
  `nombreRol` varchar(50) NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  PRIMARY KEY (`idRol`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `rol` VALUES (1,'Admin','Administra Cesfam y envia Formularios'),(2,'Externo','Administra Hospital y reenvia Formularios'),(3,'Usuario','Visualiza y administra sus datos y Formularios'),(4,'Gestionador de Roles','Acceso a la pantalla de Gestionar Roles');

-- ---- cesfam ----
DROP TABLE IF EXISTS `cesfam`;
CREATE TABLE `cesfam` (
  `idCesfam` int NOT NULL AUTO_INCREMENT,
  `nombreCesfam` varchar(150) NOT NULL,
  `calle` varchar(50) NOT NULL,
  `idComuna` int NOT NULL,
  `correo` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`idCesfam`),
  KEY `idComuna` (`idComuna`),
  CONSTRAINT `cesfam_ibfk_1` FOREIGN KEY (`idComuna`) REFERENCES `comuna` (`idComuna`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `cesfam` VALUES (1,'CESFAM Doctor Amador Neghme Rodriguez','Avenida Cancha Rayada 4149',1,NULL),(2,'CESFAM Iris Veléliz Hume','Las Acacias 2004',1,NULL),(3,'CESFAM Putre','Calle Baquedano s/n',3,NULL),(4,'CESFAM Doctor Cirilo Leal Alvarado','Avenida La Pampa 3115',5,NULL),(5,'CESFAM Doctor Pedro Pulgar Melgarejo','Avenida Los Aromos 3084',6,NULL),(6,'CESFAM Pozo Almonte','Calle Estación 815',7,NULL),(7,'CESFAM Doctor Juan Lozic Pérez','Avenida Bonilla 8902',12,NULL),(8,'CESFAM Central Calama','Avenida Gran Salar 1198',17,NULL),(9,'CESFAM Tocopilla','Calle 21 de Mayo 1245',19,NULL),(10,'CESFAM Doctor Pedro León Gallo','Calle Los Carrera 1820',21,NULL),(11,'CESFAM Rosario Palacios','Avenida Wheelwright 420',22,NULL),(12,'CESFAM Vallenar','Calle Brasil 610',26,NULL),(13,'CESFAM Emilio Schaffhauser','Calle Pedro Pablo Muñoz 320',30,NULL),(14,'CESFAM Doctor Sergio Aguilar','Avenida Videla 120',31,NULL),(15,'CESFAM Jorge Jordán Domic','Calle Socos 450',40,NULL),(16,'CESFAM Plaza Justicia','Plaza de la Justicia 99',45,NULL),(17,'CESFAM Doctor Marco Maldonado','Avenida Álvarez 1682',51,NULL),(18,'CESFAM San Felipe El Real','Avenida Maipú 250',72,NULL),(19,'CESFAM Belloto Sur','Calle Badén Powell 1005',78,NULL),(20,'CESFAM Número 5','Calle Unión Latinoamericana 98',82,NULL),(21,'CESFAM Padre Orellana','Calle Padre Orellana 1706',82,NULL),(22,'CESFAM San Alberto Hurtado','Avenida El Manzano 410',100,NULL),(23,'CESFAM Doctor Alberto Bachelet','Avenida Pajaritos 1800',100,NULL),(24,'CESFAM Los de San Bernardo','Calle Freire 810',120,NULL),(25,'CESFAM Número 1 Enrique Dintrans','Calle Baquedano 620',134,NULL),(26,'CESFAM San Fernando','Avenida Manso de Velasco 350',157,NULL),(27,'CESFAM Pichilemu','Avenida Cáhuil 410',151,NULL),(28,'CESFAM Las Américas','Calle 12 Norte 2350',167,NULL),(29,'CESFAM Curicó Centro','Calle Freire 320',180,NULL),(30,'CESFAM San Javier','Calle Chorrillos 1120',191,NULL),(31,'CESFAM San Pedro','Calle Maipón 920',196,NULL),(32,'CESFAM Ultrawesh','Avenida Sepúlveda Bustos 450',201,NULL),(33,'CESFAM San Carlos','Calle Chacabuco 540',211,NULL),(34,'CESFAM O\'Higgins','Calle Salas 540',217,NULL),(35,'CESFAM San Pedro de la Paz','Avenida Pedro Aguirre Cerda 1125',224,NULL),(36,'CESFAM Los Ángeles','Avenida Ricardo Vicuña 420',236,NULL),(37,'CESFAM Pedro de Valdivia','Avenida Pedro de Valdivia 0180',249,NULL),(38,'CESFAM Villarrica','Calle San Martín 850',268,NULL),(39,'CESFAM Angol','Calle Ilabaca 430',270,NULL),(40,'CESFAM Doctor Jorge Sabat','Calle Jorge Sabat 1205',281,NULL),(41,'CESFAM La Unión','Calle Comercio 450',289,NULL),(42,'CESFAM Panguipulli','Calle Sor Hormacina 210',288,NULL),(43,'CESFAM Angelmó','Avenida Angelmó 1850',293,NULL),(44,'CESFAM Quellón','Calle Santos Vargas 310',309,NULL),(45,'CESFAM Marcelo Lopetegui','Calle Los Carrera 720',312,NULL),(46,'CESFAM Alejandro Gutiérrez','Calle Eusebio Lillo 340',323,NULL),(47,'CESFAM Puerto Aysén','Avenida O\'Higgins 820',325,NULL),(48,'CESFAM Doctor Mateo Bencur','Avenida Eduardo Frei Montalva 01110',333,NULL),(49,'CESFAM Puerto Natales','Calle Carlos Bories 350',342,NULL);

-- ---- hospital ----
DROP TABLE IF EXISTS `hospital`;
CREATE TABLE `hospital` (
  `idHospital` int NOT NULL AUTO_INCREMENT,
  `nombreHospital` varchar(150) NOT NULL,
  `calle` varchar(50) NOT NULL,
  `idComuna` int NOT NULL,
  PRIMARY KEY (`idHospital`),
  KEY `idComuna` (`idComuna`),
  CONSTRAINT `hospital_ibfk_1` FOREIGN KEY (`idComuna`) REFERENCES `comuna` (`idComuna`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `hospital` VALUES (1,'Hospital Regional Doctor Juan Noé Crevani','Avenida Diego Portales 805',1),(2,'Hospital Regional Doctor Ernesto Torres Galdames','Avenida Heroes de la Concepción 502',5),(3,'Hospital Regional de Antofagasta Doctor Leonardo Guzmán','Avenida Azolas 3350',12),(4,'Hospital Carlos Cisternas','Avenida Chorrillos 2855',17),(5,'Hospital Regional de Copiapó San José de Carmen','Calle Los Carrera 1320',21),(6,'Hospital Provincial del Huasco Monseñor Fernando Ariztía Ruiz','Avenida Brasil 1210',26),(7,'Hospital San Pablo de Coquimbo','Avenida Videla 121',31),(8,'Hospital San Juan de Dios de La Serena','Calle Balmaceda 916',30),(9,'Hospital Antonio Tirado Lanas','Calle Ariztía 710',40),(10,'Hospital Carlos van Buren','Calle San Martín 1545',45),(11,'Hospital Doctor Gustavo Fricke','Avenida Álvarez 1532',51),(12,'Hospital San Camilo','Avenida Miraflores 2085',72),(13,'Hospital Quilpué','Calle San Martín 1270',78),(14,'Hospital Clínico José Joaquín Aguirre','Avenida Santos Dumont 999',82),(15,'Hospital San Borja Arriarán','Avenida Santa Rosa 1234',82),(16,'Hospital Doctor Sótero del Río','Avenida Concha y Toro 3459',114),(17,'Hospital El Carmen Doctor Luis Valentín Ferrada','Avenida Camino a Rinconada 1001',100),(18,'Hospital San José','Avenida San José 1196',108),(19,'Hospital Regional Libertador Bernardo O\'Higgins','Avenida Lib. Bernardo O\'Higgins 3000',134),(20,'Hospital San Juan de Dios de San Fernando','Avenida Negrete 1401',157),(21,'Hospital Regional de Talca Doctor César Garavagno Burotto','Calle 1 Norte 1990',167),(22,'Hospital San Juan de Dios de Curicó','Avenida San Martín 101',180),(23,'Hospital Base de Linares','Calle Brasil 750',189),(24,'Hospital Clínico Herminda Martín','Calle Francisco Ramírez 10',196),(25,'Hospital San José de San Carlos','Calle Gazmuri 410',211),(26,'Hospital Guillermo Grant Benavente','Calle San Martín 1436',217),(27,'Hospital Las Higueras','Avenida Alto Horno 567',226),(28,'Hospital Doctor Víctor Ríos Ruiz','Avenida Ricardo Vicuña 147',236),(29,'Hospital Doctor Hernán Henríquez Aravena','Calle Manuel Montt 115',249),(30,'Hospital Mauricio Heyermann Torres','Calle Ilabaca 850',270),(31,'Hospital San Francisco de Pucón','Calle Uruguay 325',263),(32,'Hospital Base Valdivia','Calle Simpson 850',281),(33,'Hospital Doctor Juan Morey','Calle Comercio 1010',289),(34,'Hospital Puerto Montt Doctor Eduardo Schütz Schroeder','Avenida Monseñor Ramón Munita 2500',293),(35,'Hospital Base San José de Osorno','Calle Guillermo Bühler 1765',312),(36,'Hospital Augusto Riffart de Castro','Calle Freire 850',302),(37,'Hospital Regional de Coyhaique','Calle Jorge Schythe 200',323),(38,'Hospital de Puerto Aysén','Avenida Eusebio Lillo 210',325),(39,'Hospital Clínico de Magallanes Doctor Lautaro Navarro Avaria','Avenida Los Flamencos 01364',333),(40,'Hospital Doctor Augusto Essmann Burgos','Calle Ignacio Carrera Pinto 1500',342);

-- ---- estados ----
DROP TABLE IF EXISTS `estados`;
CREATE TABLE `estados` (
  `idEstado` int NOT NULL AUTO_INCREMENT,
  `nombreEstado` varchar(50) NOT NULL,
  PRIMARY KEY (`idEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `estados` VALUES (1,'Registrada'),(2,'En lista de espera'),(3,'Devuelta'),(4,'Tramitada'),(5,'Agendada'),(6,'Finalizada');

-- ---- especialidad ----
DROP TABLE IF EXISTS `especialidad`;
CREATE TABLE `especialidad` (
  `idEspecialidad` int NOT NULL AUTO_INCREMENT,
  `nombreEspecialidad` varchar(100) NOT NULL,
  PRIMARY KEY (`idEspecialidad`),
  UNIQUE KEY `nombreEspecialidad` (`nombreEspecialidad`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO `especialidad` VALUES (1,'Cardiología'),(2,'Dermatología'),(3,'Endocrinología'),(4,'Gastroenterología'),(5,'Ginecología'),(6,'Neurología'),(7,'Oftalmología'),(8,'Otorrinolaringología'),(9,'Traumatología'),(10,'Urología');

-- ---- persona ----
DROP TABLE IF EXISTS `persona`;
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- acceso ----
DROP TABLE IF EXISTS `acceso`;
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

-- ---- formulario ----
DROP TABLE IF EXISTS `formulario`;
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
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- formulario_documento ----
DROP TABLE IF EXISTS `formulario_documento`;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- formulario_historial ----
DROP TABLE IF EXISTS `formulario_historial`;
CREATE TABLE `formulario_historial` (
  `idHistorial` int NOT NULL AUTO_INCREMENT,
  `idFormulario` int NOT NULL,
  `idEstadoAnterior` int DEFAULT NULL,
  `idEstadoNuevo` int NOT NULL,
  `idPersona` int DEFAULT NULL,
  `fecha` datetime NOT NULL,
  `comentario` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`idHistorial`),
  KEY `idx_formulario` (`idFormulario`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- formulario_observacion ----
DROP TABLE IF EXISTS `formulario_observacion`;
CREATE TABLE `formulario_observacion` (
  `Observacion` varchar(200) NOT NULL,
  `idFormulario` int NOT NULL,
  PRIMARY KEY (`Observacion`,`idFormulario`),
  KEY `idFormulario` (`idFormulario`),
  CONSTRAINT `formulario_observacion_ibfk_1` FOREIGN KEY (`idFormulario`) REFERENCES `formulario` (`idFormulario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- notificacion_correo ----
DROP TABLE IF EXISTS `notificacion_correo`;
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
  KEY `idx_formulario_notif` (`idFormulario`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- persona_contactos ----
DROP TABLE IF EXISTS `persona_contactos`;
CREATE TABLE `persona_contactos` (
  `contactos` int NOT NULL,
  `idPersona` int NOT NULL,
  `tipo` char(1) NOT NULL DEFAULT 'P',
  PRIMARY KEY (`contactos`,`idPersona`),
  KEY `id_Persona` (`idPersona`),
  CONSTRAINT `persona_contactos_ibfk_1` FOREIGN KEY (`idPersona`) REFERENCES `persona` (`idPersona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- persona_correos ----
DROP TABLE IF EXISTS `persona_correos`;
CREATE TABLE `persona_correos` (
  `correos` varchar(50) NOT NULL,
  `idPersona` int NOT NULL,
  PRIMARY KEY (`correos`,`idPersona`),
  KEY `id_Persona` (`idPersona`),
  CONSTRAINT `persona_correos_ibfk_1` FOREIGN KEY (`idPersona`) REFERENCES `persona` (`idPersona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---- Usuario administrador de roles ----
-- RUT 99999999-9 | Clave inicial: ver Manual de Instalación (bcrypt $2b$12$, mismo formato que el resto de la tabla)
-- Roles: 3 (Usuario) y 4 (Gestionador de Roles). idCesfam/idHospital = 0 (sin asignacion).
INSERT INTO `persona` (`idPersona`,`rut`,`calle`,`dv`,`nombrePersona`,`clave`,`fechaNac`,`idComuna`) VALUES
(17,99999999,'Sin direccion','9','Admin Roles','$2b$12$bx4rLcrkh2vRgeACAt4.8uEqm7hW8rXJTHWpGx7kEZMa7HFL0mmmG','2000-01-01',82);
INSERT INTO `acceso` (`Activo`,`idCesfam`,`idHospital`,`idPersona`,`idRol`) VALUES
('S',0,0,17,3),('S',0,0,17,4);

SET FOREIGN_KEY_CHECKS=1;
