const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
	videoId: { type: String, required: true },
	users: [{ userId: {type: String}, userName: {type: String}}]
});


const Room = mongoose.model("room", roomSchema);



module.exports = { Room };