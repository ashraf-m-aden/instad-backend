const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URL)
  .then((data) => {
    console.log("mongoose connected successfuly ");
  })
  .catch((error) => {
    console.log("mongoose not connected ");
  });

module.exports = mongoose;
