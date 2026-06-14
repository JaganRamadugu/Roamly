const mongoose = require("mongoose");
const initData = require("./data.js");
const Listings = require("../models/listing.js");

const mongo_url = "mongodb://127.0.0.1:27017/roamly";

async function main() {
  await mongoose.connect(mongo_url);
}

main()
  .then(() => console.log("Connected to DB"))
  .catch(err => console.log(err));

const initDB = async () => {
  await Listings.deleteMany({});
  await Listings.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();