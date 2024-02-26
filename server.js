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
    console.log('A user connected');

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User joined room ${room}`);
    });

    // Handle video control events within a room
    socket.on('play', (room) => {
        io.to(room).emit('play');
        console.log("playing")
    });

    socket.on('pause', (room) => {
        io.to(room).emit('pause');
    });

    socket.on('seek', (room, time) => {
        io.to(room).emit('seek', time);
        console.log("seeking")
    });

    socket.on('chatMessage', ({ room, message }) => {
        console.log(message)
        io.to(room).emit('chatMessage', {
            user: "Ambrose", // For simplicity, using socket.id as the user identifier
            message,
        });
        console.log("emmitted", message)
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
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