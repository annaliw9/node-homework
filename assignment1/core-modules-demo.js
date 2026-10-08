const os = require("os");
const path = require("path");
const fs = require("fs");

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log("Platform:", os.platform());
console.log("CPU:", os.cpus()[0].model);
console.log("Total Memory:", os.totalmem());

// Path module
console.log("Joined path:", path.join(sampleFilesDir, "demo.txt"));

// fs.promises API
async function readAndWriteFile() {
  const filePath = path.join(sampleFilesDir, "demo.txt");
  try {
    await fs.promises.writeFile(filePath, "Hello from fs.promises!");
    const data = await fs.promises.readFile(filePath, "utf8");
    console.log("fs.promises read:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

readAndWriteFile();

// Streams for large files- log first 40 chars of each chunk
const largeFilePath = path.join(sampleFilesDir, "largefile.txt");
let data = "";

for (let i = 1; i <= 1000; i++) {
  data += "This is line " + i + "\n";
}
fs.writeFileSync(largeFilePath, data);

const readStream = fs.createReadStream(largeFilePath, { encoding: "utf8" });

readStream.on("data", (chunk) => {
  console.log("Read chunk:", chunk.slice(0, 40));
});
readStream.on("end", () => {
  console.log("Finished reading large file with streams");
});
