-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 15, 2024 at 03:31 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bingo-game`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `agents`
--

CREATE TABLE `agents` (
  `agentId` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `currentBalance` decimal(10,2) DEFAULT NULL,
  `enabled` tinyint(1) DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `superAgentId` int(11) DEFAULT NULL,
  `stake` decimal(10,2) DEFAULT 10.00,
  `balance` decimal(10,2) DEFAULT 0.00,
  `agentType` enum('prepaid','postpaid') NOT NULL DEFAULT 'postpaid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `agent_cards`
--

CREATE TABLE `agent_cards` (
  `agentID` int(11) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bingo_cards`
--

CREATE TABLE `bingo_cards` (
  `id` int(11) NOT NULL,
  `card_number` int(11) NOT NULL,
  `card_numbers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`card_numbers`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bingo_games`
--

CREATE TABLE `bingo_games` (
  `id` int(11) NOT NULL,
  `bet_amount` decimal(10,2) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `status` enum('active','ended','drawn') NOT NULL,
  `drawn_numbers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`drawn_numbers`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `enrolled_card_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`enrolled_card_ids`)),
  `profit` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cards`
--

CREATE TABLE `cards` (
  `id` int(11) NOT NULL,
  `cardnumber` varchar(255) NOT NULL,
  `numbers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`numbers`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dailyjackpot`
--

CREATE TABLE `dailyjackpot` (
  `id` int(11) NOT NULL,
  `bingo_house_name` varchar(255) NOT NULL,
  `win_amount` decimal(10,2) NOT NULL,
  `jackpot_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `draws`
--

CREATE TABLE `draws` (
  `id` int(11) NOT NULL,
  `game_id` int(11) DEFAULT NULL,
  `number_drawn` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logo`
--

CREATE TABLE `logo` (
  `id` int(11) NOT NULL,
  `url` varchar(255) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logos`
--

CREATE TABLE `logos` (
  `id` int(11) NOT NULL,
  `dark_logo` varchar(255) NOT NULL,
  `light_logo` varchar(255) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `super_agents`
--

CREATE TABLE `super_agents` (
  `superAgentId` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `agentLimit` int(11) DEFAULT 0,
  `agents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`agents`)),
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `stake` decimal(10,2) DEFAULT NULL,
  `balance` decimal(10,2) DEFAULT 0.00,
  `agentType` enum('prepaid','postpaid') NOT NULL DEFAULT 'postpaid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `top_up_transactions`
--

CREATE TABLE `top_up_transactions` (
  `transactionId` int(11) NOT NULL,
  `superAgentId` int(11) NOT NULL,
  `topUpAmount` decimal(10,2) NOT NULL,
  `topUpDay` datetime NOT NULL DEFAULT current_timestamp(),
  `performedBy` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `transactionId` int(11) NOT NULL,
  `superAgentId` int(11) NOT NULL,
  `agentId` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('topup','withdraw') NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `agents`
--
ALTER TABLE `agents`
  ADD PRIMARY KEY (`agentId`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `superAgentId` (`superAgentId`);

--
-- Indexes for table `agent_cards`
--
ALTER TABLE `agent_cards`
  ADD PRIMARY KEY (`agentID`);

--
-- Indexes for table `bingo_cards`
--
ALTER TABLE `bingo_cards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `card_number` (`card_number`);

--
-- Indexes for table `bingo_games`
--
ALTER TABLE `bingo_games`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `cards`
--
ALTER TABLE `cards`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `dailyjackpot`
--
ALTER TABLE `dailyjackpot`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `draws`
--
ALTER TABLE `draws`
  ADD PRIMARY KEY (`id`),
  ADD KEY `game_id` (`game_id`);

--
-- Indexes for table `logo`
--
ALTER TABLE `logo`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `logos`
--
ALTER TABLE `logos`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `super_agents`
--
ALTER TABLE `super_agents`
  ADD PRIMARY KEY (`superAgentId`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `top_up_transactions`
--
ALTER TABLE `top_up_transactions`
  ADD PRIMARY KEY (`transactionId`),
  ADD KEY `superAgentId` (`superAgentId`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`transactionId`),
  ADD KEY `superAgentId` (`superAgentId`),
  ADD KEY `agentId` (`agentId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `agents`
--
ALTER TABLE `agents`
  MODIFY `agentId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bingo_cards`
--
ALTER TABLE `bingo_cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bingo_games`
--
ALTER TABLE `bingo_games`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cards`
--
ALTER TABLE `cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dailyjackpot`
--
ALTER TABLE `dailyjackpot`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `draws`
--
ALTER TABLE `draws`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `logo`
--
ALTER TABLE `logo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `logos`
--
ALTER TABLE `logos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `super_agents`
--
ALTER TABLE `super_agents`
  MODIFY `superAgentId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `top_up_transactions`
--
ALTER TABLE `top_up_transactions`
  MODIFY `transactionId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `transactionId` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `agents`
--
ALTER TABLE `agents`
  ADD CONSTRAINT `agents_ibfk_1` FOREIGN KEY (`superAgentId`) REFERENCES `super_agents` (`superAgentId`) ON DELETE SET NULL;

--
-- Constraints for table `top_up_transactions`
--
ALTER TABLE `top_up_transactions`
  ADD CONSTRAINT `top_up_transactions_ibfk_1` FOREIGN KEY (`superAgentId`) REFERENCES `super_agents` (`superAgentId`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`superAgentId`) REFERENCES `super_agents` (`superAgentId`),
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`agentId`) REFERENCES `agents` (`agentId`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
