const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const shortId = require("shortid");
const cors = require("cors");

const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

mongoose.connect(
  "mongodb+srv://moonauror:moonauror@cluster0-saaya.mongodb.net/test?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  _id: { type: String, default: shortId.generate, unique: true },
  exercises: [{
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date, required: false }
    }]
});

var User = mongoose.model("User", userSchema);

app.post("/api/exercise/new-user", function(req, res) {
  var username = req.body.username;
  var userObject = new User({
    username: username,
    exercises: []
  });

  userObject.save(function(err, data) {
    if (err) if (err.code == 11000) res.send("username already taken");
    res.send(data);
  });
});

app.get("/api/exercise/users", function(req, res) {
  User.find({}, function(err, data) {
    if (err) return console.error(err);
    res.send(data);
  });
});

app.post("/api/exercise/add", function(req, res) {
  const { userId, description, duration, date } = req.body;
  console.log(req.body);
  User.findOne({ _id: userId }, function(err, data) {
    const username = data.username;
    if (err) return console.error(err);
    var inputDate;
    if (!date || date == "") {
      inputDate = new Date()
        .toUTCString()
        .split(" ")
        .slice(0, 4)
        .join(" ");
    } else {
      inputDate = new Date(date)
        .toUTCString()
        .split(" ")
        .slice(0, 4)
        .join(" ");
    }
    if(inputDate == "Invalid Date") {
      return res.send("Invalid Date");
    }
    var exercise = {
      description: description,
      duration: parseInt(duration),
      date: inputDate
    };
    data.exercises.push(exercise);
    data.save();
    var output = {
      username: username,
      description: description,
      duration: parseInt(duration),
      _id: userId,
      date: inputDate.split(",").join("")
    };
    console.log(output);
    return res.json(output);
  });
});

app.get("/api/exercise/log?:userId:from?:to?:limit?", function(req, res) {
  var userId = req.query.userId;
  // console.log(req.query.from + " " + req.query.to);
  var fromDate = new Date(req.query.from);
  var toDate = new Date(req.query.to);
  var limit = req.query.limit;

  if (req.query.from && !req.query.to) {
    toDate = new Date();
  }
  if (req.query.to && !req.query.from) {
    fromDate = new Date(-8640000000000000);
  }

  User.findOne({ _id: userId }, function(err, data) {
    if (err) return res.send({ error: "userId not found" });
    if (data == null) return res.send("Empty");
    var output = [];
    if (!req.query.from && !req.query.to) {
      output = data.exercises;
    } else {
      // console.log(
      //   userId + " " + fromDate.toUTCString() + " " + toDate.toUTCString()
      // );
      data.exercises.forEach(function(element) {
        if (fromDate == "Invalid Date" || toDate == "Invalid Date") {
          return res.send({ error: "Invalid Date" });
        } else {
          if (element.date > fromDate && element.date < toDate) {
            output.push(element);
          }
        }
      });
    }

    if (limit) {
      output = output.slice(0, limit);
    }

    res.send({
      username: data.username,
      _id: data._id,
      log: output,
      count: output.length
    });
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});