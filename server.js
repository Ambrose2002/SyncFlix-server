require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db/conn");
const userRoutes = require("./routes/usersRouter");
const authRoutes = require("./routes/authRouter");

const { createServer } = require("http");
const httpServer = createServer(app);
const { Server } = require("socket.io");
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000"
    }
});

io.on('connection', (socket) => {

    socket.on('joinRoom', (room) => {
        socket.join(room);
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
    // {
    //     orogin: ["https://sync-flix-fd6d21fb8933.herokuapp.com/"],
    //     methods: ["GET", "POST", "DELETE"],
    //     credentials: true
    // }
));

// // routes
app.use("/api/", userRoutes);
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 3001;
httpServer.listen(port, console.log(`Listening on port ${port}...`));