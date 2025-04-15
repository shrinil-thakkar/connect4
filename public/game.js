class Connect4Game {
    constructor() {
        this.socket = io();
        this.playerName = '';
        this.roomId = '';
        this.playerSymbol = '';
        this.currentTurn = '';
        this.isAnimating = false;
        this.gameState = Array(6).fill().map(() => Array(6).fill(null));
        
        // DOM elements
        this.setupScreen = document.getElementById('setup-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.waitingScreen = document.getElementById('waiting-screen');
        this.playerNameInput = document.getElementById('player-name');
        this.roomIdInput = document.getElementById('room-id');
        this.roomIdDisplay = document.getElementById('room-id-display');
        this.waitingRoomId = document.getElementById('waiting-room-id');
        this.currentPlayerElement = document.getElementById('current-player');
        this.gameStatusElement = document.getElementById('game-status');
        this.boardElement = document.getElementById('board');
        this.createRoomButton = document.getElementById('create-room');
        this.joinRoomButton = document.getElementById('join-room');
        this.copyRoomIdButton = document.getElementById('copy-room-id');
        this.resetButton = document.getElementById('reset-button');
        this.leaveRoomButton = document.getElementById('leave-room');

        this.setupEventListeners();
        this.initializeSocketListeners();
    }

    setupEventListeners() {
        this.createRoomButton.addEventListener('click', () => this.createRoom());
        this.joinRoomButton.addEventListener('click', () => this.joinRoom());
        this.copyRoomIdButton.addEventListener('click', () => this.copyRoomId());
        this.resetButton.addEventListener('click', () => this.resetGame());
        this.leaveRoomButton.addEventListener('click', () => this.leaveRoom());
    }

    initializeSocketListeners() {
        this.socket.on('roomCreated', ({ roomId, playerName }) => {
            this.roomId = roomId;
            this.playerName = playerName;
            this.playerSymbol = 'X';
            this.currentTurn = 'X';
            this.waitingRoomId.textContent = roomId;
            this.roomIdDisplay.textContent = roomId;
            this.setupScreen.classList.add('hidden');
            this.gameScreen.classList.add('hidden');
            this.waitingScreen.classList.remove('hidden');
        });

        this.socket.on('roomJoined', ({ roomId, playerName, opponent, gameState, currentTurn, playerSymbol }) => {
            this.roomId = roomId;
            this.playerName = playerName;
            this.playerSymbol = playerSymbol;
            this.currentTurn = currentTurn;
            this.roomIdDisplay.textContent = roomId;
            this.gameStatusElement.textContent = `Playing against ${opponent}`;
            this.gameState = gameState;
            this.setupScreen.classList.add('hidden');
            this.waitingScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');
            this.initializeBoard();
            this.updateBoard(gameState);
            this.updatePlayerInfo();
        });

        this.socket.on('opponentJoined', ({ playerName, currentTurn }) => {
            this.gameStatusElement.textContent = `Playing against ${playerName}`;
            this.currentTurn = currentTurn;
            this.waitingScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');
            this.updatePlayerInfo();
        });

        this.socket.on('gameStarted', ({ players, currentTurn, gameState }) => {
            this.currentTurn = currentTurn;
            this.gameState = gameState;
            const currentPlayer = players.find(p => p.id === this.socket.id);
            this.playerSymbol = currentPlayer.symbol;
            this.updatePlayerInfo();
            this.initializeBoard();
            this.updateBoard(gameState);
            this.setupScreen.classList.add('hidden');
            this.waitingScreen.classList.add('hidden');
            this.gameScreen.classList.remove('hidden');
        });

        this.socket.on('moveMade', ({ gameState, currentTurn }) => {
            this.currentTurn = currentTurn;
            this.gameState = gameState;
            this.updateBoard(gameState);
            this.updatePlayerInfo();
        });

        this.socket.on('gameOver', ({ winner }) => {
            if (winner === this.playerName) {
                this.gameStatusElement.textContent = 'You won!';
            } else if (winner === null) {
                this.gameStatusElement.textContent = "It's a draw!";
            } else {
                this.gameStatusElement.textContent = `${winner} won!`;
            }
            this.disableBoard();
        });

        this.socket.on('opponentDisconnected', () => {
            this.gameStatusElement.textContent = 'Opponent disconnected';
            this.disableBoard();
        });

        this.socket.on('roomFull', () => {
            alert('Room is full');
        });

        this.socket.on('roomNotFound', () => {
            alert('Room not found');
        });
    }

    createRoom() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        this.socket.emit('joinRoom', { playerName });
    }

    joinRoom() {
        const playerName = this.playerNameInput.value.trim();
        const roomId = this.roomIdInput.value.trim();
        if (!playerName || !roomId) {
            alert('Please enter your name and room ID');
            return;
        }
        this.socket.emit('joinRoom', { roomId, playerName });
    }

    copyRoomId() {
        navigator.clipboard.writeText(this.roomId);
        this.copyRoomIdButton.textContent = 'Copied!';
        setTimeout(() => {
            this.copyRoomIdButton.textContent = 'Copy Room ID';
        }, 2000);
    }

    leaveRoom() {
        this.socket.emit('leaveRoom', { roomId: this.roomId });
        this.resetGameState();
    }

    resetGameState() {
        this.setupScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
        this.waitingScreen.classList.add('hidden');
        this.playerNameInput.value = '';
        this.roomIdInput.value = '';
        this.roomId = '';
        this.playerSymbol = '';
        this.currentTurn = '';
        this.gameState = Array(6).fill().map(() => Array(6).fill(null));
    }

    initializeBoard() {
        this.boardElement.innerHTML = '';
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.makeMove(col));
                this.boardElement.appendChild(cell);
            }
        }
    }

    async makeMove(col) {
        if (this.isAnimating || this.currentTurn !== this.playerSymbol) return;

        this.isAnimating = true;
        this.disableBoard();

        // Find the lowest empty row in the column
        let targetRow = -1;
        for (let row = 5; row >= 0; row--) {
            if (this.gameState[row][col] === null) {
                targetRow = row;
                break;
            }
        }

        if (targetRow === -1) {
            this.isAnimating = false;
            this.enableBoard();
            return;
        }

        // Create the falling coin element
        const fallingCoin = document.createElement('div');
        fallingCoin.className = `falling-coin player-${this.playerSymbol.toLowerCase()}`;
        
        // Add the coin to the top cell
        const topCell = this.boardElement.querySelector(`[data-row="0"][data-col="${col}"]`);
        topCell.appendChild(fallingCoin);
        
        // Fade in the coin
        await new Promise(resolve => {
            fallingCoin.classList.add('visible');
            setTimeout(resolve, 100);
        });
        
        // Animate through each row
        for (let row = 0; row <= targetRow; row++) {
            const currentCell = this.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            currentCell.appendChild(fallingCoin);
            await new Promise(resolve => setTimeout(resolve, 120));
        }

        // Update local game state
        this.gameState[targetRow][col] = this.playerSymbol;

        // Emit the move to the server
        this.socket.emit('makeMove', { roomId: this.roomId, col });

        this.isAnimating = false;
        this.enableBoard();
    }

    updateBoard(gameState) {
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            const row = Math.floor(index / 6);
            const col = index % 6;
            cell.className = 'cell';
            if (gameState[row][col] === 'X') {
                cell.classList.add('player-x');
            } else if (gameState[row][col] === 'O') {
                cell.classList.add('player-o');
            }
        });
    }

    updatePlayerInfo() {
        if (this.currentTurn === this.playerSymbol) {
            this.currentPlayerElement.textContent = 'Your turn';
        } else {
            this.currentPlayerElement.textContent = "Opponent's turn";
        }
    }

    disableBoard() {
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.cursor = 'not-allowed';
            cell.style.pointerEvents = 'none';
        });
    }

    enableBoard() {
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.cursor = 'pointer';
            cell.style.pointerEvents = 'auto';
        });
    }

    resetGame() {
        this.socket.emit('resetGame', { roomId: this.roomId });
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Connect4Game();
}); 