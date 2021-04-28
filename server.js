const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 8000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient(REDIS_PORT);
const app = express();

function setResponse(username, repos) {
  return `<h2>${username} has ${repos} Github repos</h2>`;
}

// Make request to Github for data
async function getRepos(req, res, next) {
  try {
    console.log("Fetching Data...");
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const repos = data.public_repos;

    //Set Data to redis
    client.setex(username, 3600, repos);
    res.send(setResponse(username, repos));
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

//Cache Middleware
function cache(req, res, next) {
  const { username } = req.params;

  client.get(username, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
}

app.use(cors());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Demo of Nodejs and Redis");
});

app.get("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
