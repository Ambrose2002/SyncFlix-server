const router = require("express").Router();
const { User, validate } = require("../models/usersModel");
const bcrypt = require("bcrypt");
const multer = require('multer');
const jwt = require("jsonwebtoken");
const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs");
const mongoose = require("mongoose")

const secretKey = process.env.JWTPRIVATEKEY

const authenticateToken = (req, res, next) => {
	console.log("Authorization started")
	const token = req.header('Authorization');

	if (!token) return res.status(401).json({ message: 'Unauthorized' });

	jwt.verify(token, secretKey, (err, decoded) => {
		if (err) return res.status(403).json({ message: 'Invalid token' });
		console.log(decoded)
		req.userId = decoded._id;
		console.log(req.userId)
		next();
	});
};

router.get("/", authenticateToken, async (req, res) => {
	const userId = req.userId;

	const user = await User.findOne({ _id: userId })
	if (!user) return res.status(404).json({ message: 'User not found' });
	const firstName = user.firstName;
	if (!firstName) return res.status(404).json({ message: 'User not found' });
	res.send(user);
})


const db = mongoose.connection;
const bucket = new GridFSBucket(db);

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {

	console.log("uploading...")

	const { title } = req.body;
	if (!req.file) return res.status(500).send({ message: "Attach file"})
	const videoFile = req.file.buffer;
	console.log("title: " + title)

	const videoUploadStream = bucket.openUploadStream(title);
	const videoId = videoUploadStream.id;

	videoUploadStream.end(videoFile);

	videoUploadStream.on('finish', async () => {
		console.log(`Video ${videoId} uploaded successfully`);
		const userId = req.userId;
		await User.updateOne({_id : userId}, { $push: {videos: { videoId: videoId, title: title}}})
		const videoData = { videoId: videoId, title: title}
		res.status(200).send(videoData);
	});

	videoUploadStream.on('error', (error) => {
		console.error('Error uploading video:', error.message);
		res.status(500).send('Error uploading video');
	});
});


module.exports = router;