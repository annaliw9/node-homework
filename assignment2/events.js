const EventEmitter = require("events");
const emitter = new EventEmitter();

//Listener receives the data
emitter.on("time", (message) => {
  //Print the result
  console.log("Time received:", message);
});

module.exports = emitter;

if (require.main === module) {
  setInterval(() => {
    //Create the current time
    const currentTime = new Date().toString();
    //Emit the event
    emitter.emit("time", currentTime);
  }, 5000); //Timer runs every 5 seconds
}
