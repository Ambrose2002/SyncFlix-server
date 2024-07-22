require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db/conn");
const userRoutes = require("./routes/usersRouter");
const authRoutes = require("./routes/authRouter");
const mongoose = require("mongoose")

const { createServer } = require("http");
const httpServer = createServer(app);
const { Server } = require("socket.io");
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000"
    }
});

const { Room } = require('./models/roomsModel');

io.on('connection', (socket) => {

    socket.on('joinRoom', async (room) => {
        socket.join(room);

        const roomDoc = await Room.findOne({ _id: room });
        if (roomDoc) {
            socket.emit('syncTime', { currentTime: roomDoc.currentTime });
        }
    });

    // Handle video control events within a room
    socket.on('play', (room) => {
        io.to(room).emit('play');
    });

    socket.on('pause', (room) => {
        io.to(room).emit('pause');
    });

    socket.on('seek', (room, time) => {
        io.to(room).emit('seek', time);
    });

    socket.on('updateTime', async ({ roomId, currentTime }) => {
        // Update playback time in MongoDB
        const room = await Room.updateOne({_id: roomId}, {$set: {currentTime: currentTime}})
        if (!room) console.log("no room found")
        
        // Broadcast the updated time to all clients in the room
        io.to(room).emit('syncTime', { currentTime });
    });

    socket.on('chatMessage', ({ roomId, message, userName }) => {
        io.to(roomId).emit('message', {
            user: userName,
            message,
        });
    });

    socket.on('disconnect', () => {
    });
});

// database connection
connection();

// middlewares
app.use(express.json());
app.use(cors(
    {
        orogin: ["https://syncflix-front-6ee3d875f855.herokuapp.com/"],
        methods: ["GET", "POST", "DELETE"],
        credentials: true
    }
));


// // routes
app.use("/api/", userRoutes);
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 3001;
httpServer.listen(port, console.log(`Listening on port ${port}...`));