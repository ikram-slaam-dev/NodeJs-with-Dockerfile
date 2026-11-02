const express = require("express");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory task list (resets when the container restarts)
let tasks = [
  { id: 1, title: "Learn Docker", done: false },
  { id: 2, title: "Deploy container on EC2", done: false },
];

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>Node.js on Docker</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 80px;">
        <h1>Hello from Node.js running in Docker on AWS EC2!</h1>
        <p>Container hostname: <b>${os.hostname()}</b></p>
        <p>Node version: <b>${process.version}</b></p>
        <p>Try: <a href="/health">/health</a> | <a href="/api/tasks">/api/tasks</a></p>
      </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), time: new Date().toISOString() });
});

app.get("/api/tasks", (req, res) => res.json(tasks));

app.post("/api/tasks", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const task = { id: tasks.length ? tasks[tasks.length - 1].id + 1 : 1, title, done: false };
  tasks.push(task);
  res.status(201).json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  tasks = tasks.filter((t) => t.id !== Number(req.params.id));
  res.status(204).end();
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
