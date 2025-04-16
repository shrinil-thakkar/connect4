class Connect4Game {
    constructor() {
        this.socket = io();
        this.playerName = '';
        this.roomId = null;
        this.isPlayer1 = false;
        this.gameBoard = Array(6).fill().map(() => Array(7).fill(null));
        this.currentPlayer = 'player1';
        this.gameActive = false;
        
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

        // Initialize buttons
        this.submitNameBtn = document.getElementById('submit-name');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.copyRoomIdBtn = document.getElementById('copy-room-id');
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

        // Copy room ID
        this.copyRoomIdBtn.addEventListener('click', () => this.copyRoomId());

        // Leave room
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
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

        // Animate the coin falling and then emit the move
        this.animateFallingCoin(col, row, () => {
            this.socket.emit('makeMove', { roomId: this.roomId, col });
        });
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

    copyRoomId() {
        if (!this.roomId) return;
        
        const tempInput = document.createElement('input');
        tempInput.value = this.roomId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        this.copyRoomIdBtn.textContent = 'Copied!';
        setTimeout(() => {
            this.copyRoomIdBtn.textContent = 'Copy Room ID';
        }, 2000);
    }

    leaveRoom() {
        this.socket.emit('leaveRoom', { roomId: this.roomId });
        this.roomId = null;
        this.isPlayer1 = false;
        this.gameBoard = Array(6).fill().map(() => Array(7).fill(null));
        this.showScreen('lobby');
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Connect4Game();
}); 