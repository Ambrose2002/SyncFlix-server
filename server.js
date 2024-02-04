require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db/conn");
const userRoutes = require("./routes/usersRouter");
const authRoutes = require("./routes/authRouter");

// database connection
connection();

// middlewares
app.use(express.json());
// app.use(cors(
//     {
//         orogin: ["https://syncflix-front-6ee3d875f855.herokuapp.com/"],
//         methods: ["GET", "POST", "DELETE"],
//         credentials: true
//     }
// ));

// // routes
app.use("/api/", userRoutes);
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 3001;
app.listen(port, console.log(`Listening on port ${port}...`));