const router = require("express").Router();
const { User, validate } = require("../models/usersModel");
const bcrypt = require("bcrypt");
const multer = require('multer');
const jwt = require("jsonwebtoken");
const { MongoClient, GridFSBucket } = require("mongodb");
const fs = require("fs");
const mongodb = require('mongodb');
const mongoose = require("mongoose")
const gridfs = require('gridfs-stream');

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
	const firstName = user.firstName;
	if (!firstName) return res.status(404).json({ message: 'User not found' });
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

	// const videoUploadStream = bucket.openUploadStream(title);
	// const videoId = videoUploadStream.id;

	// videoUploadStream.end(videoFile);

	// videoUploadStream.on('finish', async () => {
	// 	console.log(`Video ${videoId} uploaded successfully`);
	// 	const userId = req.userId;
	// 	await User.updateOne({ _id: userId }, { $push: { videos: { videoId: videoId, title: title } } })
	// 	const videoData = { videoId: videoId, title: title }
	// 	res.status(200).send(videoData);
	// });

	// videoUploadStream.on('error', (error) => {
	// 	console.error('Error uploading video:', error.message);
	// 	res.status(500).send('Error uploading video');
	// });
	const videoUploadStream = bucket.openUploadStream('title');
	const videoReadStream = fs.createReadStream(videoFile)
	console.log(videoReadStream)
	videoReadStream.pipe(videoUploadStream);
	res.status(200).send("Done...");
});


router.get("/video", function (req, res) {

	const range = req.headers.range;
	if (!range) {
		res.status(400).send("Requires Range header");
	}

	// GridFS Collection
	db.collection('fs.files').findOne({filename: 'fs'}, (err, video) => {
		if (!video) {
			console.log("video not found")
			res.status(404).send("No video uploaded!");
			return;
		}

		// Create response headers
		const videoSize = video.length;
		// const start = Number(range.replace(/\D/g, ""));
		// const end = videoSize - 1;
		const CHUNK_SIZE = 10 ** 6
		const start = Number(range.replace(/\D/g, ""))
		const end = Math.min(start + CHUNK_SIZE, videoSize - 1)

		console.log('start:', start);
		console.log('end:', end);
		console.log('videoSize:', videoSize);
		console.log("range: ", range)

		const contentLength = end - start + 1;
		const headers = {
			"Content-Range": `bytes ${start}-${end}/${videoSize}`,
			"Accept-Ranges": "bytes",
			"Content-Length": contentLength,
			"Content-Type": "video/mp4",
		};

		// HTTP Status 206 for Partial Content
		res.writeHead(206, headers);

		// const bucket = new mongodb.GridFSBucket(db);
		// console.log(bucket)
		const downloadStream = bucket.openDownloadStreamByName('fs', {
			start, end
		});

		// Finally pipe video to response
		downloadStream.pipe(res);
	});
	;
});

// router.get("/video", function (req, res) {
// 	console.log("fetching...")
// 	MongoClient.connect("mongodb+srv://ambrose2002blay:Ab0209282124@cluster0.7v8mith.mongodb.net/?retryWrites=true&w=majority", function (error, client) {
// 		console.log("checking if error")
// 		if (error) {
// 			console.log(error)
// 			res.status(500).json(error);
// 			return;
// 		}
// 		console.log("connected to db")

// 		const range = req.headers.range;
// 		if (!range) {
// 			res.status(400).send("Requires Range header");
// 		}

// 		const db = client.db('test');
// 		// GridFS Collection
// 		db.collection('fs.files').findOne({}, (err, video) => {
// 			if (!video) {
// 				res.status(404).send("No video uploaded!");
// 				return;
// 			}

// 			// Create response headers
// 			const videoSize = video.length;
// 			const start = Number(range.replace(/\D/g, ""));
// 			const end = videoSize - 1;

// 			const contentLength = end - start + 1;
// 			const headers = {
// 				"Content-Range": `bytes ${start}-${end}/${videoSize}`,
// 				"Accept-Ranges": "bytes",
// 				"Content-Length": contentLength,
// 				"Content-Type": "video/mp4",
// 			};

// 			// HTTP Status 206 for Partial Content
// 			res.writeHead(206, headers);

// 			const bucket = new mongodb.GridFSBucket(db);
// 			const downloadStream = bucket.openDownloadStreamByName('fs', {
// 				start
// 			});

// 			// Finally pipe video to response
// 			downloadStream.pipe(res);
// 		});
// 	});
// });




// router.get("/video", authenticateToken, async (req, res) => {
// 	console.log("Fetch request received")

// 	// const videoId = req.params.id;
// 	const videoId = '65b58c038b81dd75d4e861ce';

// 	// console.log("gfs: ", gfs)

// 	const video = await db.collection("fs.files").findOne({})
// 	// console.log(video)
// 	// console.log("video", video)

// 	const range = req.headers.range;
// 	console.log("range", range)
//     if (!range) {
//       res.status(400).send("Requires Range header");
// 	  return
//     }

// 	db.collection('fs.files').findOne({}, (err, video) => {
// 		if (!video) {
// 		  res.status(404).send("No video uploaded!");
// 		  return;
// 		}

// 		// Create response headers
// 		const videoSize = video.length;
// 		const start = Number(range.replace(/\D/g, ""));
// 		const end = videoSize - 1;

// 		const contentLength = end - start + 1;
// 		const headers = {
// 		  "Content-Range": `bytes ${start}-${end}/${videoSize}`,
// 		  "Accept-Ranges": "bytes",
// 		  "Content-Length": contentLength,
// 		  "Content-Type": "video/mp4",
// 		};

// 		// HTTP Status 206 for Partial Content
// 		res.writeHead(206, headers);

// 		const bucket = new mongodb.GridFSBucket(db);
// 		const downloadStream = bucket.openDownloadStreamByName('bigbuck', {
// 		  start
// 		});

// 		// Finally pipe video to response
// 		downloadStream.pipe(res);
// 	  });

// })

module.exports = router;