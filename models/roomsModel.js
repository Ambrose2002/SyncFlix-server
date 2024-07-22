const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
	videoId: { type: String, required: true },
	users: [{ userId: { type: String }, userName: { type: String } }],
	currentTime: { type: Number, default: 0}
});


const Room = mongoose.model("room", roomSchema);



module.exports = { Room };