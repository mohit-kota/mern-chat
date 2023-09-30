const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const ws = require("ws");
const fs = require('fs');

require("dotenv").config();

// mogoose connection configuration

mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("connected");
});
// env file configuration
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);
// Mongoose Schema files configuration
const User = require("./Models/User");
const Message = require("./Models/Message");
const app = express();

//function
async function getUserDataFromRequest(req){
  return new Promise((resolve,reject)=>{
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        // console.log(userData);
        resolve(userData);
      });
    }
    else{
      reject('no token');
    }
  });
  
}

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

app.use('/uploads',express.static(__dirname+'/uploads'));

app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
  res.json("test ok");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const userDoc = await User.create({
      username,
      password: hashedPassword,
    });

    jwt.sign({ userId: userDoc._id, username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res
        .cookie("token", token, { sameSite: "none", secure: true })
        .status(201)
        .json({ id: userDoc._id, username });
    });
  } catch (e) {
    if (e) throw e;
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(201)
            .json({ id: foundUser._id, username });
        }
      );
    }
  }
});

app.post('/logout',(req,res)=>{
  res.cookie("token", '', { sameSite: "none", secure: true }).json('ok');
})

app.get('/messages/:userId', async (req,res)=>{
  const {userId} = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  
  const messages  = await Message.find({
    sender:{$in:[userId,ourUserId]},
    recipient:{$in:[userId,ourUserId]},
  }).sort({createdAt:1});
  res.json(messages);
  
})

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("no token");
  }
});


app.get('/people',async (req,res)=>{
  const users = await User.find({},{'_id':1,username:1});
  res.json(users);
})

const server = app.listen(3000);

// creating web socket server

// wss is websocketserver
const wss = new ws.WebSocketServer({ server });

function notifyAboutOnlinePeople(){
  [...wss.clients].forEach((client) => {
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.UserId,
          username: c.username,
        })),
      })
    );
  });
}

wss.on("connection", (connection, req) => {
  connection.isAlive = true;
  connection.timer = setInterval(()=>{
    connection.ping();
    connection.deathTimer = setTimeout(()=>{
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('death')
    },1000);
  },5000);


  connection.on('pong',()=>{
    clearTimeout(connection.deathTimer);
  })
  const cookies = req.headers.cookie;

  // read username and id from the cookie for this connection
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;

          connection.UserId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on("message",async (message) => {
    const messageData = JSON.parse(message.toString());
    const {recipient,text,file} = messageData;
    let filename = null;
    if(file){
      const parts = file.name.split('.');
      const ext = parts[parts.length -1];
      filename = Date.now()+'.'+ext;
      const path = __dirname +'/uploads/'+filename;
      const bufferData = new Buffer(file.data.split(',')[1],'base64');
      fs.writeFile(path,bufferData,()=>{
        console.log('file saved '+path);
      });
    }
    // console.log({recipient,text});
    if(recipient && (text || file) ){
        console.log(filename);
        const messageDoc = await Message.create({
            sender:connection.UserId,
            recipient,
            text,
            file: file ? filename:null,
        });

        [...wss.clients].filter( c => c.UserId === recipient)
        .forEach(c => c.send(JSON.stringify({text,
            sender:connection.UserId,
            _id:messageDoc._id,
            file: file ? filename :null,
            recipient,
        })));
    }
  });

  // notify everyone about online people
  notifyAboutOnlinePeople();
});


