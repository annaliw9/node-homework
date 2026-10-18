const express = require("express");

const app = express();

app.use(express.json()); //When a client sends JSON, Express needs to convert the raw JSON text into a JavaScript object. With this line in place, your route handler can read that object from req.body

app.get("/info", (req, res) => {
  res.json({
    message: "This is an Express server.",
  });
});

app.post("/echo", (req, res) => {
  res.json({
    weReceived: req.body,
  });
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
