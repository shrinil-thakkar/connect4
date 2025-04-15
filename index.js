const readline = require('readline');
const GameBoard = require('./gameBoard');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const game = new GameBoard();

function playGame() {
    game.printBoard();
    console.log(`Player ${game.currentPlayer}'s turn`);

    rl.question('Enter column number (0-5): ', (answer) => {
        const col = parseInt(answer);

        if (isNaN(col) || col < 0 || col >= game.cols) {
            console.log('Invalid input! Please enter a number between 0 and 5.');
            playGame();
            return;
        }

        if (game.isColumnFull(col)) {
            console.log('Column is full! Please choose another column.');
            playGame();
            return;
        }

        game.dropPiece(col);
        const winner = game.checkWin();

        if (winner) {
            game.printBoard();
            console.log(`Player ${winner} wins!`);
            rl.close();
            return;
        }

        if (game.isBoardFull()) {
            game.printBoard();
            console.log('Game over! It\'s a draw!');
            rl.close();
            return;
        }

        game.switchPlayer();
        playGame();
    });
}

console.log('Welcome to Connect 4!');
console.log('Player X goes first, then Player O');
console.log('Enter a column number (0-5) to drop your piece');
playGame(); 