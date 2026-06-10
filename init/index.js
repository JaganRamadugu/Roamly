const mongoose = require("mongoose");
const initData = require("./data.js");
const Listings = require("../models/listing.js");

const mongo_url = "mongodb://127.0.0.1:27017/roamly";

main()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch(() => {
    console.log(err);
  });
async function main() {
  await mongoose.connect(mongo_url);
}

const initDB = async () => {
  await Listings.deleteMany({});
  initData.data = initData.data.map((obj) => ({
    ...obj,
    owner: "6a22b2d02d518da471a0d93d",
  }));
  await Listings.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();
