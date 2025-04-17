class Connect4Game {
    constructor() {
        this.socket = io();
        this.playerName = '';
        this.roomId = null;
        this.isPlayer1 = false;
        this.gameBoard = Array(6).fill().map(() => Array(7).fill(null));
        this.currentPlayer = 'player1';
        this.gameActive = false;
        this.isBotMode = false;
        
        // Initialize DOM elements
        this.nameScreen = document.getElementById('name-screen');
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.playerNameInput = document.getElementById('player-name');
        this.playerNameDisplay = document.getElementById('player-name-display');
        this.roomIdDisplay = document.getElementById('room-id-display');
        this.currentPlayerDisplay = document.getElementById('current-player');
        this.gameMessageDisplay = document.getElementById('game-message');
        this.board = document.getElementById('board');
        this.roomList = document.getElementById('room-list');
        this.waitingActions = document.getElementById('waiting-actions');
        this.playBotBtn = document.getElementById('play-bot-btn');

        // Initialize buttons
        this.submitNameBtn = document.getElementById('submit-name');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.leaveRoomBtn = document.getElementById('leave-room');

        this.setupEventListeners();
        this.initializeSocketEvents();
    }

    setupEventListeners() {
        // Name submission
        this.submitNameBtn.addEventListener('click', () => {
            const name = this.playerNameInput.value.trim();
            if (name) {
                this.playerName = name;
                this.playerNameDisplay.textContent = name;
                this.showScreen('lobby');
                this.socket.emit('enterLobby', { playerName: name });
            } else {
                alert('Please enter your name');
            }
        });

        // Create room
        this.createRoomBtn.addEventListener('click', () => {
            this.socket.emit('createRoom', { playerName: this.playerName });
        });

        // Leave room
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        // Play vs Bot
        this.playBotBtn.addEventListener('click', () => this.startBotMode());
    }

    initializeSocketEvents() {
        // Available rooms update
        this.socket.on('availableRooms', (rooms) => {
            this.updateRoomList(rooms);
        });

        // Room created
        this.socket.on('roomCreated', ({ roomId }) => {
            this.roomId = roomId;
            this.isPlayer1 = true;
            this.roomIdDisplay.textContent = roomId;
            this.showScreen('game');
            this.initializeBoard();
            this.gameMessageDisplay.textContent = 'Waiting for opponent...';
        });

        // Room joined
        this.socket.on('roomJoined', ({ roomId, gameState }) => {
            this.roomId = roomId;
            this.isPlayer1 = false;
            this.roomIdDisplay.textContent = roomId;
            this.showScreen('game');
            this.initializeBoard();
            this.updateGameState(gameState);
        });

        // Game state update
        this.socket.on('gameState', (gameState) => {
            this.updateGameState(gameState);
        });

        // Error handling
        this.socket.on('error', (message) => {
            alert(message);
        });
    }

    updateRoomList(rooms) {
        this.roomList.innerHTML = '';
        
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = `room-item ${room.id === this.roomId ? 'my-room' : ''}`;
            roomItem.innerHTML = `
                <div class="room-info">
                    <div class="room-number">Room ${room.id}</div>
                    <div class="room-creator">Created by: ${room.creator}</div>
                    <div class="room-status">${room.status === 'waiting' ? 'Waiting for opponent...' : 'Game in progress'}</div>
                </div>
                ${room.id !== this.roomId ? '<button class="join-btn">Join</button>' : ''}
            `;
            
            const joinBtn = roomItem.querySelector('.join-btn');
            if (joinBtn) {
                joinBtn.addEventListener('click', () => {
                    if (!this.playerName) {
                        alert('Please enter your name first');
                        return;
                    }
                    this.socket.emit('joinRoom', { 
                        roomId: room.id, 
                        playerName: this.playerName 
                    });
                });
            }
            
            this.roomList.appendChild(roomItem);
        });
    }

    showScreen(screenName) {
        this.nameScreen.classList.add('hidden');
        this.lobbyScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');

        switch (screenName) {
            case 'name':
                this.nameScreen.classList.remove('hidden');
                break;
            case 'lobby':
                this.lobbyScreen.classList.remove('hidden');
                break;
            case 'game':
                this.gameScreen.classList.remove('hidden');
                break;
        }
    }

    initializeBoard() {
        this.board.innerHTML = '';
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.handleCellClick(col));
                this.board.appendChild(cell);
            }
        }
    }

    handleCellClick(col) {
        if (!this.gameActive) return;
        
        // Check if it's the player's turn
        const isMyTurn = (this.isPlayer1 && this.currentPlayer === 'player1') ||
                        (!this.isPlayer1 && this.currentPlayer === 'player2');
        
        if (!isMyTurn) {
            this.displayMessage("It's not your turn!");
            return;
        }

        // Find the lowest empty row in the column
        let row = 5;
        while (row >= 0 && this.gameBoard[row][col] !== null) {
            row--;
        }

        if (row < 0) return; // Column is full

        // Make the move
        this.gameBoard[row][col] = this.currentPlayer;
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add(this.currentPlayer);

        // Check for win
        if (this.checkWin(row, col)) {
            this.gameActive = false;
            this.displayMessage("You win!");
            return;
        }

        // Check for draw
        if (this.isBoardFull()) {
            this.gameActive = false;
            this.displayMessage("It's a draw!");
            return;
        }

        // Switch players
        this.currentPlayer = this.currentPlayer === 'player1' ? 'player2' : 'player1';

        // If it's bot mode and bot's turn, make bot move
        if (this.isBotMode && this.currentPlayer === 'player2') {
            this.displayMessage("Bot is thinking...");
            setTimeout(() => this.makeBotMove(), 1000);
        } else if (!this.isBotMode) {
            // If not bot mode, emit the move to the server
            this.socket.emit('makeMove', { roomId: this.roomId, col });
        }
    }

    animateFallingCoin(col, targetRow, callback) {
        // Remove any existing falling coin
        const existingCoin = document.querySelector('.falling-coin');
        if (existingCoin) {
            existingCoin.remove();
        }

        // Create the falling coin element
        const coin = document.createElement('div');
        coin.className = `falling-coin ${this.currentPlayer}`;
        
        // Get the target cell and board position
        const targetCell = document.querySelector(`[data-row="${targetRow}"][data-col="${col}"]`);
        const boardRect = this.board.getBoundingClientRect();
        const cellRect = targetCell.getBoundingClientRect();

        // Calculate the exact position where the coin should fall
        const coinLeft = cellRect.left - boardRect.left;
        
        // Position the coin at the top of the correct column
        coin.style.left = `${coinLeft}px`;
        coin.style.top = '0px';  // Start from the top of the board
        
        // Add the coin to the game board
        this.board.appendChild(coin);

        // Animate the coin falling through each row
        let currentRow = 0;
        const animateNextRow = () => {
            if (currentRow <= targetRow) {
                const currentCell = document.querySelector(`[data-row="${currentRow}"][data-col="${col}"]`);
                const currentCellRect = currentCell.getBoundingClientRect();
                
                coin.style.transition = 'top 0.15s ease-in';  // Slower animation
                coin.style.top = `${currentCellRect.top - boardRect.top}px`;
                
                currentRow++;
                setTimeout(animateNextRow, 150);  // Longer delay between rows
            } else {
                // Add a small delay before removing the coin and completing the move
                setTimeout(() => {
                    coin.remove();
                    if (callback) callback();
                }, 100);
            }
        };

        // Start the animation after a brief delay to ensure transition is applied
        requestAnimationFrame(() => {
            requestAnimationFrame(animateNextRow);
        });
    }

    updateGameState(gameState) {
        this.gameBoard = gameState.board;
        this.currentPlayer = gameState.currentPlayer;
        this.gameActive = gameState.status === 'playing';

        // Update the board display
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                cell.className = 'cell';
                if (gameState.board[row][col] === 'player1') {
                    cell.classList.add('player1');
                } else if (gameState.board[row][col] === 'player2') {
                    cell.classList.add('player2');
                }
            }
        }

        // Hide bot button if game is active or there are 2 players
        if (gameState.status === 'playing' || (gameState.players && gameState.players.length === 2)) {
            this.waitingActions.style.display = 'none';
        } else {
            this.waitingActions.style.display = 'flex';
        }

        // Update game status message
        if (gameState.status === 'waiting') {
            this.displayMessage("Waiting for opponent...");
        } else if (gameState.status === 'gameOver') {
            if (gameState.winner === 'draw') {
                this.displayMessage("Game Over - It's a Draw!");
            } else {
                const winnerName = gameState.players.find(p => p.name === gameState.winner)?.name || 'Unknown';
                this.displayMessage(`Game Over - ${winnerName} wins!`);
            }
        } else if (gameState.status === 'playing') {
            const currentPlayerName = gameState.players.find(p => 
                p.color === gameState.currentPlayer
            )?.name || 'Unknown';
            this.displayMessage(`${currentPlayerName}'s turn`);
        }
    }

    displayMessage(message) {
        this.gameMessageDisplay.textContent = message;
    }

    leaveRoom() {
        if (this.isBotMode) {
            this.isBotMode = false;
            this.gameActive = false;
            this.gameBoard = Array(6).fill().map(() => Array(7).fill(null));
            this.currentPlayer = 'player1';
            this.showScreen('lobby');
        } else {
            this.socket.emit('leaveRoom', { roomId: this.roomId });
            this.roomId = null;
            this.isPlayer1 = false;
            this.gameBoard = Array(6).fill().map(() => Array(7).fill(null));
            this.showScreen('lobby');
        }
    }

    startBotMode() {
        this.isBotMode = true;
        this.gameActive = true;
        this.waitingActions.style.display = 'none';
        this.displayMessage("Your turn");

        // Bot will always be player2 (yellow)
        this.isPlayer1 = true;
        this.currentPlayer = 'player1';
    }

    makeBotMove() {
        // Simple bot strategy: choose a random valid column
        const validColumns = [];
        for (let col = 0; col < 7; col++) {
            if (this.gameBoard[0][col] === null) {
                validColumns.push(col);
            }
        }

        if (validColumns.length === 0) return;

        const randomCol = validColumns[Math.floor(Math.random() * validColumns.length)];
        let row = 5;
        while (row >= 0 && this.gameBoard[row][randomCol] !== null) {
            row--;
        }

        // Animate and make the move
        this.animateFallingCoin(randomCol, row, () => {
            this.gameBoard[row][randomCol] = 'player2';
            const cell = document.querySelector(`[data-row="${row}"][data-col="${randomCol}"]`);
            cell.classList.add('player2');

            // Check for win
            if (this.checkWin(row, randomCol)) {
                this.gameActive = false;
                this.displayMessage("Bot wins!");
                return;
            }

            // Check for draw
            if (this.isBoardFull()) {
                this.gameActive = false;
                this.displayMessage("It's a draw!");
                return;
            }

            // Switch back to player's turn
            this.currentPlayer = 'player1';
            this.displayMessage("Your turn");
        });
    }

    checkWin(row, col) {
        const directions = [
            [[0, 1], [0, -1]], // horizontal
            [[1, 0], [-1, 0]], // vertical
            [[1, 1], [-1, -1]], // diagonal \
            [[1, -1], [-1, 1]] // diagonal /
        ];

        const currentPlayer = this.gameBoard[row][col];

        for (const [dir1, dir2] of directions) {
            let count = 1;
            count += this.countDirection(row, col, dir1[0], dir1[1], currentPlayer);
            count += this.countDirection(row, col, dir2[0], dir2[1], currentPlayer);
            if (count >= 4) return true;
        }
        return false;
    }

    countDirection(row, col, rowDir, colDir, player) {
        let count = 0;
        let r = row + rowDir;
        let c = col + colDir;

        while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.gameBoard[r][c] === player) {
            count++;
            r += rowDir;
            c += colDir;
        }
        return count;
    }

    isBoardFull() {
        return this.gameBoard[0].every(cell => cell !== null);
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Connect4Game();
}); 