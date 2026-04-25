CREATE TABLE games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bet_amount DECIMAL(10, 2),
    audio_option VARCHAR(50),
    winning_pattern VARCHAR(255),
    call_speed INT,
    status ENUM('active', 'ended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT,
    number_drawn INT,
    FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE bingo_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT,
    card_numbers JSON,
    FOREIGN KEY (game_id) REFERENCES games(id)
);
