class Connect4Game {
    constructor() {
        this.gameBoard = new GameBoard();
        this.boardElement = document.getElementById('board');
        this.currentPlayerElement = document.getElementById('current-player');
        this.gameStatusElement = document.getElementById('game-status');
        this.resetButton = document.getElementById('reset-button');
        this.isAnimating = false;
        
        this.initializeBoard();
        this.setupEventListeners();
        this.updateGameInfo();
    }

    initializeBoard() {
        this.boardElement.innerHTML = '';
        for (let row = 0; row < this.gameBoard.rows; row++) {
            for (let col = 0; col < this.gameBoard.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.boardElement.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        this.boardElement.addEventListener('click', (event) => {
            const cell = event.target;
            if (cell.classList.contains('cell') && !this.isAnimating) {
                const col = parseInt(cell.dataset.col);
                this.makeMove(col);
            }
        });

        this.resetButton.addEventListener('click', () => {
            this.resetGame();
        });
    }

    async makeMove(col) {
        if (this.gameBoard.isColumnFull(col)) {
            this.gameStatusElement.textContent = 'Column is full!';
            return;
        }

        this.isAnimating = true;
        this.disableBoard();

        // Find the lowest empty row in the column
        let targetRow = -1;
        for (let row = this.gameBoard.rows - 1; row >= 0; row--) {
            if (this.gameBoard.board[row][col] === null) {
                targetRow = row;
                break;
            }
        }

        if (targetRow === -1) return;

        // Create the falling coin element
        const fallingCoin = document.createElement('div');
        fallingCoin.className = `falling-coin player-${this.gameBoard.currentPlayer.toLowerCase()}`;
        
        // Add the coin to the top cell
        const topCell = this.boardElement.querySelector(`[data-row="0"][data-col="${col}"]`);
        topCell.appendChild(fallingCoin);
        
        // Fade in the coin
        await new Promise(resolve => {
            fallingCoin.classList.add('visible');
            setTimeout(resolve, 100);
        });
        
        // Animate through each row with a smoother transition
        for (let row = 0; row <= targetRow; row++) {
            const currentCell = this.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            
            // Move the coin to the current cell
            currentCell.appendChild(fallingCoin);
            
            // Wait for a shorter duration to make the movement faster
            await new Promise(resolve => setTimeout(resolve, 120));
        }

        // Add a small delay before updating the game state
        await new Promise(resolve => setTimeout(resolve, 50));

        // Update the game state after animation
        this.gameBoard.dropPiece(col);
        this.updateBoard();
        
        const winner = this.gameBoard.checkWin();
        if (winner) {
            this.gameStatusElement.textContent = `Player ${winner} wins!`;
            this.disableBoard();
            this.isAnimating = false;
            return;
        }

        if (this.gameBoard.isBoardFull()) {
            this.gameStatusElement.textContent = "It's a draw!";
            this.disableBoard();
            this.isAnimating = false;
            return;
        }

        this.gameBoard.switchPlayer();
        this.updateGameInfo();
        this.isAnimating = false;
        this.enableBoard();
    }

    updateBoard() {
        const cells = this.boardElement.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = this.gameBoard.board[row][col];
            
            cell.className = 'cell';
            if (value === 'X') {
                cell.classList.add('player-x');
            } else if (value === 'O') {
                cell.classList.add('player-o');
            }
        });
    }

    updateGameInfo() {
        this.currentPlayerElement.textContent = `Player ${this.gameBoard.currentPlayer}'s turn`;
        this.gameStatusElement.textContent = '';
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
        this.gameBoard = new GameBoard();
        this.initializeBoard();
        this.updateGameInfo();
        this.updateBoard();
        this.isAnimating = false;
        this.enableBoard();
    }
}

class GameBoard {
    constructor() {
        this.rows = 6;
        this.cols = 6;
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(null));
        this.currentPlayer = 'X';
    }

    dropPiece(col) {
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[row][col] === null) {
                this.board[row][col] = this.currentPlayer;
                return true;
            }
        }
        return false;
    }

    isColumnFull(col) {
        return this.board[0][col] !== null;
    }

    isBoardFull() {
        return this.board[0].every(cell => cell !== null);
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    checkWin() {
        // Check horizontal
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols - 3; col++) {
                if (this.board[row][col] !== null &&
                    this.board[row][col] === this.board[row][col + 1] &&
                    this.board[row][col] === this.board[row][col + 2] &&
                    this.board[row][col] === this.board[row][col + 3]) {
                    return this.board[row][col];
                }
            }
        }

        // Check vertical
        for (let row = 0; row < this.rows - 3; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] !== null &&
                    this.board[row][col] === this.board[row + 1][col] &&
                    this.board[row][col] === this.board[row + 2][col] &&
                    this.board[row][col] === this.board[row + 3][col]) {
                    return this.board[row][col];
                }
            }
        }

        // Check diagonal (down-right)
        for (let row = 0; row < this.rows - 3; row++) {
            for (let col = 0; col < this.cols - 3; col++) {
                if (this.board[row][col] !== null &&
                    this.board[row][col] === this.board[row + 1][col + 1] &&
                    this.board[row][col] === this.board[row + 2][col + 2] &&
                    this.board[row][col] === this.board[row + 3][col + 3]) {
                    return this.board[row][col];
                }
            }
        }

        // Check diagonal (down-left)
        for (let row = 0; row < this.rows - 3; row++) {
            for (let col = 3; col < this.cols; col++) {
                if (this.board[row][col] !== null &&
                    this.board[row][col] === this.board[row + 1][col - 1] &&
                    this.board[row][col] === this.board[row + 2][col - 2] &&
                    this.board[row][col] === this.board[row + 3][col - 3]) {
                    return this.board[row][col];
                }
            }
        }

        return null;
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Connect4Game();
}); 