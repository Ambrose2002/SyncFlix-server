const mongoose = require("mongoose");

module.exports = () => {
	const connectionParams = {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	};
	try {
		mongoose.connect(process.env.ATLAS_URI, connectionParams);
		console.log("Connected to database successfully");
	} catch (error) {
		console.log("Could not connect database!");
	}
};