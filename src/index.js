const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");

const session_secret = "newton";

const app = express();
app.use(express.json()); 
app.use(cors({
    credentials: true,
    origin: "http://localhost:3000"
}));
app.use(
  session({
    secret: session_secret,
    cookie: { maxAge: 1*60*60*1000 }
  })
); 
const db = mongoose.createConnection("mongodb://localhost:27017/TEDAssignment", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// schemas
const userSchema = new mongoose.Schema({
  userName: String,
  password: String,
});

const MultiChoiceSchema = new mongoose.Schema({
   Question: String,
   choice1: String,
   choice2: String,
   Choice3: String,
   choice4 : String
});
// models
const userModel = db.model("user", userSchema);
const MultiChoiceModel = db.model("multichoice", MultiChoiceSchema);

// backend apis
const isNullOrUndefined = (val) => val === null || val === undefined;
const SALT = 5;

app.post("/signup", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({ userName });
  if (isNullOrUndefined(existingUser)) {
    
    const hashedPwd = bcrypt.hashSync(password, SALT);
    const newUser = new userModel({ userName, password: hashedPwd });

    await newUser.save();
    req.session.userId = newUser._id;
    res.status(201).send({ success: "Signed up" });
  } else {
    res.status(400).send({
      err: `UserName ${userName} already exists. Please choose another.`,
    });
  }
});

app.post("/login", async (req, res) => {
  const { userName, password } = req.body;
  const existingUser = await userModel.findOne({
    userName,
  });

  if (isNullOrUndefined(existingUser)) {
    res.status(401).send({ err: "UserName does not exist." });
  } else {
    const hashedPwd = existingUser.password;
    if (bcrypt.compareSync(password, hashedPwd)) {
      req.session.userId = existingUser._id;
      console.log('Session saved with', req.session);
      res.status(200).send({ success: "Logged in" });
    } else {
      res.status(401).send({ err: "Password is incorrect." });
    }
  }
});

const AuthMiddleware = async (req, res, next) => {
    console.log('Session', req.session);
  // added user key to req
  if (isNullOrUndefined(req.session) || isNullOrUndefined(req.session.userId) ) {
    res.status(401).send({ err: "Not logged in" });
  } else {
    next();
  }
};

app.get("/question", AuthMiddleware, async (req, res) => {
  const allQuestions = await MultiChoiceModel.find({ userId: req.session.userId });
  res.send(allQuestions);
});

app.post("/question", AuthMiddleware, async (req, res) => {
  const MultiChoiceQuestion = req.body;
  MultiChoiceQuestion.question = req.body.question;
  MultiChoiceQuestion.choice1 = req.body.choice1;
  MultiChoiceQuestion.choice2 = req.body.choice2;
  MultiChoiceQuestion.choice3 = req.body.choice3;
  MultiChoiceQuestion.choice4 = req.body.choice4;
 
 
  const newQuestion= MultiChoiceModel(MultiChoiceQuestion);
  await newQuestion.save();
  res.status(201).send(newQuestion);
});


app.get("/logout", (req, res)=> {
    if(!isNullOrUndefined(req.session)) {
        // destroy the session
        req.session.destroy(() => {
            res.sendStatus(200);
        });

    } else {
        res.sendStatus(200);
    }
});

app.get('/userinfo', AuthMiddleware, async (req, res) => {
    const user = await userModel.findById(req.session.userId);
    res.send({ userName : user.userName });
});

app.listen(9999);
