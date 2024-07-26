const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URL)
  .then((data) => {
    console.log("mongoose connected successfuly "+process.env.MONGODB_URL);
  })
  .catch((error) => {
    console.log(error);
    console.log("mongoose not connected "+process.env.MONGODB_URL);
  });

module.exports = mongoose;
