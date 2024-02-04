require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db/conn");
const userRoutes = require("./routes/usersRouter");
const authRoutes = require("./routes/authRouter");

const http = require('http');
const server = http.createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server);

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle video stream
    socket.on('video_stream', (data) => {
        io.emit('video_frame', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
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
app.listen(port, console.log(`Listening on port ${port}...`));