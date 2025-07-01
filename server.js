const express = require("express");
// const dotenv = require("dotenv");
const dotenv = require("dotenv");
dotenv.config();

const scriptRouter = require("./routes/script");
const audioRouter = require("./routes/audio");
const studentRouter = require("./routes/student");

dotenv.config();
const app = express();

app.use(express.json());

app.use("/api/script", scriptRouter);
app.use("/api/audio", audioRouter);
app.use("/api/student", studentRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
