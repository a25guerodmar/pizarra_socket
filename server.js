
const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173'
    }
});

app.use(express.static('dist'));

const dibujos = {}
const salas = {}

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado:', socket.id);

    socket.on('join_room', function(datos) {
        socket.join(datos.roomName);

        if (!dibujos[datos.roomName]) {
            dibujos[datos.roomName] = []
        }

        socket.emit('cargar_dibujos', dibujos[datos.roomName])

        console.log(datos.username, 'ha entrado en la sala:', datos.roomName);
    });

    socket.on('draw_begin', function(datos) {
        if (!dibujos[datos.roomName]) {
            dibujos[datos.roomName] = []
        }

        dibujos[datos.roomName].push({
            tipo: 'inicio',
            x: datos.x,
            y: datos.y,
            color: datos.color
        })

        socket.to(datos.roomName).emit('draw_begin', {
            roomName: datos.roomName,
            id: socket.id,
            x: datos.x,
            y: datos.y,
            color: datos.color
        });
    });

    socket.on('draw_move', function(datos) {
        if (!dibujos[datos.roomName]) {
            dibujos[datos.roomName] = []
        }

        dibujos[datos.roomName].push({
            tipo: 'movimiento',
            x: datos.x,
            y: datos.y,
            color: datos.color
        })

        socket.to(datos.roomName).emit('draw_move', {
            roomName: datos.roomName,
            id: socket.id,
            x: datos.x,
            y: datos.y,
            color: datos.color
        });
    });

    socket.on('moverCursor', function(datos) {
        socket.to(datos.roomName).emit('cursor:mover', {
            roomName: datos.roomName,
            id: socket.id,
            nombre: datos.nombre,
            color: datos.color,
            x: datos.x,
            y: datos.y
        });
    });

    socket.on('draw_end', function(datos) {
        socket.to(datos.roomName).emit('draw_end', {
            roomName: datos.roomName,
            id: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('Un usuario se ha desconectado:', socket.id);
    });
});

const PORT = 40302;

server.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
