-- Adaptado para importación en phpMyAdmin
-- Elimina configuraciones avanzadas y deja solo lo esencial para crear las tablas y relaciones.

DROP TABLE IF EXISTS `Messages`;
DROP TABLE IF EXISTS `Users`;

CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `score` int DEFAULT '0',
  `area` varchar(255) DEFAULT NULL,
  `skills` json DEFAULT NULL,
  `goals` json DEFAULT NULL,
  `jobType` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `experienceLevel` varchar(255) DEFAULT 'Sin experiencia',
  `profilePicture` longtext,
  `cvText` longtext,
  `resetPasswordToken` varchar(255) DEFAULT NULL,
  `resetPasswordExpires` datetime DEFAULT NULL,
  `hunterNotificationsEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `hunterLastNotifiedAt` datetime DEFAULT NULL,
  `hunterSeenJobIds` json DEFAULT NULL,
  `googleId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `Messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `sender` enum('user','ai') NOT NULL,
  `text` text NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `Messages_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Puedes agregar aquí tus INSERTs si necesitas datos de ejemplo.
