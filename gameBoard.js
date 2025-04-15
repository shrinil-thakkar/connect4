class GameBoard {
    constructor(rows = 6, cols = 6) {
        this.rows = rows;
        this.cols = cols;
        this.board = Array(rows).fill().map(() => Array(cols).fill(null));
        this.currentPlayer = 'X'; // X will be player 1, O will be player 2
    }

    // Check if a column is full
    isColumnFull(col) {
        return this.board[0][col] !== null;
    }

    // Drop a piece in a column
    dropPiece(col) {
        if (col < 0 || col >= this.cols) {
            return false;
        }

        if (this.isColumnFull(col)) {
            return false;
        }

        // Find the lowest empty row in the column
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[row][col] === null) {
                this.board[row][col] = this.currentPlayer;
                return true;
            }
        }
        return false;
    }

    // Switch players
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    // Check for a win
    checkWin() {
        // Check horizontal
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col <= this.cols - 4; col++) {
                if (this.board[row][col] &&
                    this.board[row][col] === this.board[row][col + 1] &&
                    this.board[row][col] === this.board[row][col + 2] &&
                    this.board[row][col] === this.board[row][col + 3]) {
                    return this.board[row][col];
                }
            }
        }

        // Check vertical
        for (let row = 0; row <= this.rows - 4; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] &&
                    this.board[row][col] === this.board[row + 1][col] &&
                    this.board[row][col] === this.board[row + 2][col] &&
                    this.board[row][col] === this.board[row + 3][col]) {
                    return this.board[row][col];
                }
            }
        }

        // Check diagonal (down-right)
        for (let row = 0; row <= this.rows - 4; row++) {
            for (let col = 0; col <= this.cols - 4; col++) {
                if (this.board[row][col] &&
                    this.board[row][col] === this.board[row + 1][col + 1] &&
                    this.board[row][col] === this.board[row + 2][col + 2] &&
                    this.board[row][col] === this.board[row + 3][col + 3]) {
                    return this.board[row][col];
                }
            }
        }

        // Check diagonal (down-left)
        for (let row = 0; row <= this.rows - 4; row++) {
            for (let col = 3; col < this.cols; col++) {
                if (this.board[row][col] &&
                    this.board[row][col] === this.board[row + 1][col - 1] &&
                    this.board[row][col] === this.board[row + 2][col - 2] &&
                    this.board[row][col] === this.board[row + 3][col - 3]) {
                    return this.board[row][col];
                }
            }
        }

        return null;
    }

    // Check if the board is full
    isBoardFull() {
        return this.board[0].every(cell => cell !== null);
    }

    // Print the board
    printBoard() {
        console.log('\nCurrent Board:');
        console.log('  ' + Array(this.cols).fill().map((_, i) => i).join(' '));
        this.board.forEach((row, i) => {
            console.log(i + ' ' + row.map(cell => cell || '.').join(' '));
        });
        console.log('\n');
    }
}

module.exports = GameBoard; 