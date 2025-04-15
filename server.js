const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Game rooms
const rooms = new Map();

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle joining a game room
    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (!roomId) {
            // Create new room
            roomId = uuidv4();
            const gameState = Array(6).fill().map(() => Array(6).fill(null));
            rooms.set(roomId, {
                players: [{ id: socket.id, name: playerName, symbol: 'X' }],
                gameState,
                currentTurn: 'X'
            });
            socket.emit('roomCreated', { roomId, playerName });
        } else if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            if (room.players.length < 2) {
                // Join existing room
                const newPlayer = { id: socket.id, name: playerName, symbol: 'O' };
                room.players.push(newPlayer);
                
                // Notify the joining player
                socket.emit('roomJoined', { 
                    roomId, 
                    playerName, 
                    opponent: room.players[0].name,
                    gameState: room.gameState,
                    currentTurn: room.currentTurn,
                    playerSymbol: newPlayer.symbol
                });
                
                // Notify the existing player
                socket.to(roomId).emit('opponentJoined', { 
                    playerName,
                    currentTurn: room.currentTurn
                });
                
                // Start the game for both players
                io.to(roomId).emit('gameStarted', {
                    players: room.players,
                    currentTurn: room.currentTurn,
                    gameState: room.gameState
                });
            } else {
                socket.emit('roomFull');
            }
        } else {
            socket.emit('roomNotFound');
        }
        socket.join(roomId);
    });

    // Handle game moves
    socket.on('makeMove', ({ roomId, col }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const currentPlayer = room.players.find(p => p.id === socket.id);
        if (!currentPlayer || currentPlayer.symbol !== room.currentTurn) return;

        // Update game state
        for (let row = 5; row >= 0; row--) {
            if (room.gameState[row][col] === null) {
                room.gameState[row][col] = currentPlayer.symbol;
                break;
            }
        }

        // Check for win
        const winner = checkWin(room.gameState);
        if (winner) {
            io.to(roomId).emit('gameOver', { winner: currentPlayer.name });
            rooms.delete(roomId);
            return;
        }

        // Check for draw
        if (isBoardFull(room.gameState)) {
            io.to(roomId).emit('gameOver', { winner: null });
            rooms.delete(roomId);
            return;
        }

        // Switch turns
        room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';

        // Broadcast the move to all players in the room
        io.to(roomId).emit('moveMade', {
            gameState: room.gameState,
            currentTurn: room.currentTurn
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        // Find and clean up any rooms the player was in
        for (const [roomId, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const opponent = room.players[1 - playerIndex];
                if (opponent) {
                    io.to(opponent.id).emit('opponentDisconnected');
                }
                rooms.delete(roomId);
            }
        }
    });
});

// Helper functions
function checkWin(board) {
    // Check horizontal
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] && 
                board[row][col] === board[row][col + 1] &&
                board[row][col] === board[row][col + 2] &&
                board[row][col] === board[row][col + 3]) {
                return board[row][col];
            }
        }
    }

    // Check vertical
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 6; col++) {
            if (board[row][col] && 
                board[row][col] === board[row + 1][col] &&
                board[row][col] === board[row + 2][col] &&
                board[row][col] === board[row + 3][col]) {
                return board[row][col];
            }
        }
    }

    // Check diagonal (down-right)
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (board[row][col] && 
                board[row][col] === board[row + 1][col + 1] &&
                board[row][col] === board[row + 2][col + 2] &&
                board[row][col] === board[row + 3][col + 3]) {
                return board[row][col];
            }
        }
    }

    // Check diagonal (down-left)
    for (let row = 0; row < 3; row++) {
        for (let col = 3; col < 6; col++) {
            if (board[row][col] && 
                board[row][col] === board[row + 1][col - 1] &&
                board[row][col] === board[row + 2][col - 2] &&
                board[row][col] === board[row + 3][col - 3]) {
                return board[row][col];
            }
        }
    }

    return null;
}

function isBoardFull(board) {
    return board[0].every(cell => cell !== null);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 