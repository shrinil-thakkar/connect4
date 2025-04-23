const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Game rooms
const rooms = new Map();
let nextRoomId = 1;

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle entering lobby
    socket.on('enterLobby', ({ playerName }) => {
        // Send available rooms to the new player
        const availableRooms = Array.from(rooms.values())
            .filter(r => r.players.length < 2)
            .map(r => ({
                id: r.id,
                creator: r.players[0].name,
                status: r.status
            }));
        socket.emit('availableRooms', availableRooms);
    });

    // Handle creating a room
    socket.on('createRoom', ({ playerName }) => {
        const roomId = nextRoomId++;
        const room = {
            id: roomId,
            players: [{
                id: socket.id,
                name: playerName,
                color: 'player1'
            }],
            board: Array(6).fill().map(() => Array(7).fill(null)),
            currentPlayer: 'player1',
            status: 'waiting'
        };
        
        rooms.set(roomId, room);
        socket.join(roomId);
        socket.roomId = roomId;

        // Notify the room creator
        socket.emit('roomCreated', { roomId });

        // Update available rooms for all players
        io.emit('availableRooms', Array.from(rooms.values())
            .filter(r => r.players.length < 2)
            .map(r => ({
                id: r.id,
                creator: r.players[0].name,
                status: r.status
            })));
    });

    // Handle joining a room
    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full');
            return;
        }

        // Add player to room
        room.players.push({
            id: socket.id,
            name: playerName,
            color: 'player2'
        });

        // Join socket room
        socket.join(roomId);
        socket.roomId = roomId;

        // Update room status and start game
        room.status = 'playing';
        room.gameActive = true;

        // Create game state
        const gameState = {
            board: room.board,
            currentPlayer: room.currentPlayer,
            players: room.players,
            status: room.status,
            gameActive: true
        };

        // Notify both players with the same game state
        io.to(roomId).emit('gameState', gameState);

        // Notify the joining player specifically
        socket.emit('roomJoined', {
            roomId,
            gameState
        });

        // Update available rooms for all players
        const availableRooms = Array.from(rooms.values())
            .filter(r => r.players.length < 2)
            .map(r => ({
                id: r.id,
                creator: r.players[0].name,
                status: r.status
            }));
        io.emit('availableRooms', availableRooms);
    });

    // Handle making a move
    socket.on('makeMove', ({ col }) => {
        const room = rooms.get(socket.roomId);
        if (!room || room.status !== 'playing') return;

        // Find the player
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Check if it's the player's turn
        const isCorrectTurn = (player.color === 'player1' && room.currentPlayer === 'player1') ||
                            (player.color === 'player2' && room.currentPlayer === 'player2');
        
        if (!isCorrectTurn) return;

        // Find the first empty row in the column
        let row = 5;
        while (row >= 0 && room.board[row][col] !== null) {
            row--;
        }

        if (row < 0) return; // Column is full

        // Make the move
        room.board[row][col] = player.color;

        // Check for win
        if (checkWin(room.board, row, col, player.color)) {
            room.status = 'gameOver';
            room.winner = player.name;
        } else if (isBoardFull(room.board)) {
            room.status = 'gameOver';
            room.winner = 'draw';
        } else {
            // Switch players
            room.currentPlayer = room.currentPlayer === 'player1' ? 'player2' : 'player1';
        }

        // Broadcast the updated game state to all players in the room
        io.to(socket.roomId).emit('gameState', {
            board: room.board,
            currentPlayer: room.currentPlayer,
            players: room.players,
            status: room.status,
            winner: room.winner
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            rooms.delete(socket.roomId);
            
            // Notify other players in the room
            socket.to(socket.roomId).emit('error', 'Opponent disconnected');
            
            // Update available rooms for all players
            io.emit('availableRooms', Array.from(rooms.values())
                .filter(r => r.players.length < 2)
                .map(r => ({
                    id: r.id,
                    creator: r.players[0].name,
                    status: r.status
                })));
        }
    });

    // Handle leaving a room
    socket.on('leaveRoom', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        // Remove player from room
        room.players = room.players.filter(p => p.id !== socket.id);

        // If room is empty, delete it
        if (room.players.length === 0) {
            rooms.delete(roomId);
        } else {
            // Notify remaining player
            io.to(roomId).emit('error', 'Opponent left the game');
            room.status = 'waiting';
            room.gameActive = false;
        }

        // Leave socket room
        socket.leave(roomId);
        socket.roomId = null;

        // Update available rooms for all players
        const availableRooms = Array.from(rooms.values())
            .filter(r => r.players.length < 2)
            .map(r => ({
                id: r.id,
                creator: r.players[0].name,
                status: r.status
            }));
        io.emit('availableRooms', availableRooms);
    });
});

// Helper function to check for a win
function checkWin(board, row, col, player) {
    const directions = [
        [[0, 1], [0, -1]], // horizontal
        [[1, 0], [-1, 0]], // vertical
        [[1, 1], [-1, -1]], // diagonal \
        [[1, -1], [-1, 1]] // diagonal /
    ];

    for (const [dir1, dir2] of directions) {
        let count = 1;
        count += countDirection(board, row, col, dir1[0], dir1[1], player);
        count += countDirection(board, row, col, dir2[0], dir2[1], player);
        if (count >= 4) return true;
    }
    return false;
}

// Helper function to count consecutive pieces in a direction
function countDirection(board, row, col, rowDir, colDir, player) {
    let count = 0;
    let r = row + rowDir;
    let c = col + colDir;
    
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
        count++;
        r += rowDir;
        c += colDir;
    }
    
    return count;
}

// Helper function to check if the board is full
function isBoardFull(board) {
    return board[0].every(cell => cell !== null);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 