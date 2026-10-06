# Node.js Fundamentals

## What is Node.js?

A runtime environment for running JS on the computer or a server rather than the browser.

## How does Node.js differ from running JavaScript in the browser?

The browser runs JavaScript on the client side to make web pages interactive, while Node.js runs JavaScript on the server side to build web applications and APIs

## What is the V8 engine, and how does Node use it?

It is an engine that reads the JS and turns it into fast instructions the computer can run

## What are some key use cases for Node.js?

1. Read and write files
2. Start a web server
3. Read environment variables
4. Work with operating system services
5. Use backend libraries like Express

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**

```js
Node use require() for importing libraries, files, code, and uses module.exports for exporting
For example:
const { register, logoff } = require("../controllers/userController");
module.exports = { add, multiply };
```

**ES Modules (supported in modern Node.js):**

```js
Node can also use file with .mjs extension
```
