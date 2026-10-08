const fs = require("fs");
const path = require("path");

// Write a sample file for demonstration
fs.writeFileSync(
  path.join(__dirname, "sample-files", "sample.txt"),
  "Hello, async world!",
);

// 1. Callback style
fs.readFile(
  path.join(__dirname, "sample-files", "sample.txt"),
  "utf8",
  (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("File content (callback):", data);

    // Callback hell example (test and leave it in comments):
    // fs.readFile(
    //   path.join(__dirname, "sample-files", "sample.txt"),
    //   "utf8",
    //   (err, data) => {
    //     if (err) {
    //       console.error("Error reading file:", err);
    //       return;
    //     }
    //     console.log("File content (callback):", data);

    //     fs.readFile(
    //       path.join(__dirname, "sample-files", "sample.txt"),
    //       "utf8",
    //       (err2, data2) => {
    //         if (err2) {
    //           console.error("Error reading file:", err2);
    //           return;
    //         }
    //         console.log("File content (callback):", data2);
    //       },
    //     );
    //   },
    // );

    // 2. Promise style
    fs.promises
      .readFile(path.join(__dirname, "sample-files", "sample.txt"), "utf8")
      .then((data) => {
        console.log("File content (Promise):", data);
      })
      .catch((err) => {
        console.error(err);
      });

    // 3. Async/Await style
    async function readFileAsync() {
      try {
        const data = await fs.promises.readFile(
          path.join(__dirname, "sample-files", "sample.txt"),
          "utf8",
        );
        console.log("File content (Async/Await):", data);
      } catch (err) {
        console.error(err);
      }
    }

    readFileAsync();
  },
);
