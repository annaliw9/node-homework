//Route handlers are functions that are executed when a specific route is matched. They receive the request and response objects as arguments, allowing you to handle the incoming request and send back a response.

function getTime(req, res) {
  res.status(200).json({
    time: new Date().toString(),
  });
}

function echoBody(req, res) {
  res.status(200).json({
    weReceived: req.body,
  });
}

module.exports = {
  getTime,
  echoBody,
};
