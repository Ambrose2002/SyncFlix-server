const router = require("express").Router();
const { User, validate } = require("../models/usersModel");
const { Room } = require("../models/roomsModel");
const bcrypt = require("bcrypt");
const multer = require('multer');
const jwt = require("jsonwebtoken");
const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs");
const mongodb = require('mongodb');
const mongoose = require("mongoose")
const gridfs = require('gridfs-stream');
const { Duplex } = require('stream');

const secretKey = process.env.JWTPRIVATEKEY

const authenticateToken = (req, res, next) => {
	// console.log("Authorization started")
	const token = req.header('Authorization');

	if (!token) return res.status(401).json({ message: 'Unauthorized' });

	jwt.verify(token, secretKey, (err, decoded) => {
		if (err) return res.status(403).json({ message: 'Invalid token' });
		// console.log(decoded)
		req.userId = decoded._id;
		// console.log(req.userId)
		next();
	});
};

router.get("/", authenticateToken, async (req, res) => {
	const userId = req.userId;

	const user = await User.findOne({ _id: userId })
	if (!user) return res.status(404).json({ message: 'User not found' });
	res.send(user);
})


const db = mongoose.connection;
const bucket = new GridFSBucket(db);
let gfs = gridfs(db, mongoose.mongo);

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {

	console.log("uploading...")

	const { title } = req.body;
	if (!req.file) return res.status(500).send({ message: "Attach file" })
	const videoFile = req.file.buffer;
	console.log("title: " + title)

	const videoUploadStream = bucket.openUploadStream(title);
	const videoId = videoUploadStream.id;

	videoUploadStream.end(videoFile);

	videoUploadStream.on('finish', async () => {
		console.log(`Video ${videoId} uploaded successfully`);
		const userId = req.userId;
		await User.updateOne({ _id: userId }, { $push: { videos: { videoId: videoId, title: title } } })
		const videoData = { videoId: videoId, title: title }
		res.status(200).send(videoData);
	});

	videoUploadStream.on('error', (error) => {
		console.error('Error uploading video:', error.message);
		res.status(500).send('Error uploading video');
	});
});


router.get("/video/:videoId", function (req, res) {
	videoId = req.params.videoId;
	const videoIdObject = new mongoose.Types.ObjectId(videoId);

	const range = req.headers.range;
	if (!range) {
		res.status(400).send("Requires Range header");
	}

	// GridFS Collection
	db.collection('fs.files').findOne({ _id: videoIdObject }, (err, video) => {
		if (err) {
			console.log(err);
			res.status(500).send(err)
		}
		if (!video) {
			console.log("video not found")
			res.status(404).send("No video uploaded!");
			return;
		}

		// Create response headers
		const videoSize = video.length;
		const start = Number(range.replace(/\D/g, ""));
		const end = videoSize - 1;

		const contentLength = end - start + 1;
		const headers = {
			"Content-Range": `bytes ${start}-${end}/${videoSize}`,
			"Accept-Ranges": "bytes",
			"Content-Length": contentLength,
			"Content-Type": "video/mp4",
		};

		// HTTP Status 206 for Partial Content
		res.writeHead(206, headers);

		const bucket = new mongodb.GridFSBucket(db);
		const downloadStream = bucket.openDownloadStreamByName(video.filename, {
			start, end
		});

		// Finally pipe video to response
		downloadStream.pipe(res);
	});
	;
});

router.delete('/video/:videoId', authenticateToken, async (req, res) => {
	const videoId = req.params.videoId;

	const videoIdObject = new mongoose.Types.ObjectId(videoId);
	const userId = req.userId;

	const video = await User.findOne({ _id: userId, "videos.videoId": videoIdObject });
	if (!video) return res.status(404).json({ message: 'Video not found' })

	await User.updateOne({ _id: userId }, { $pull: { videos: { videoId: videoIdObject } } })

	bucket.delete(videoIdObject, (err, result) => {
		if (err) return res.status(500).send("error deletiing from bucket");
		res.status(200).send({ message: "Video deleted" });
	});
})

router.post('/room/create', async (req, res) => {
	const { videoId, userId, userName } = req.body;
	console.log(req.body)
	
	const room = await new Room({videoId: videoId, users: [{userId: userId, userName: userName}]}).save();

	res.status(201).send({roomId: room._id})
})

router.post('/room/join', async (req, res) => {
	console.log("...joining")
	const {roomId, userId, userName} = req.body;
	console.log(req.body)

	const room = await Room.updateOne({ _id: roomId }, { $push: { users: { userId: userId, userName: userName } } })
	if (!room) return res.status(404).json({ message: 'Room not found' });
	const updatedRoom = await Room.findOne({_id: roomId})
	res.send(updatedRoom)
})

module.exports = router;