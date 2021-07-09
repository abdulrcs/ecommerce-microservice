const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 7070;
const mongoose = require("mongoose");
const User = require("./User");
const jwt = require("jsonwebtoken");

app.use(express.json());

mongoose.connect(
  "mongodb://localhost/auth-service",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log(`Auth-service DB connected`);
  }
);

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ message: "User doesn't exist" });
  } else {
    // check if password is correct
    if (password !== user.password) {
      return res.json({ message: "Password Incorrect" });
    }

    // create jwt token
    const payload = {
      email,
      name: user.name,
    };

    jwt.sign(payload, "secret", (err, token) => {
      if (err) console.log(err);
      else return res.json({ token: token });
    });
  }
});

// Register
app.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  const userExist = await User.findOne({ email });

  if (userExist) {
    return res.json({ message: "User already exists" });
  } else {
    const newUser = new User({
      name,
      email,
      password,
    });
    newUser.save();
    return res.json(newUser);
  }
});

// get all
app.get("/profiles/", async (req, res) => {
  const users = await User.find({});
  return res.send(users);
});

// get by name
app.get("/profile/:name", async (req, res) => {
  const name = req.params.name;
  const user = await User.findOne({ name });
  return res.json(user);
});

app.listen(PORT, () => {
  console.log(`Auth Service at ${PORT}`);
});
