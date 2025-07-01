const express = require("express");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const axios = require("axios");
const { db } = require("../db");
const AWS = require("aws-sdk");

const router = express.Router();

// const router = express.Router();

// Setup R2 client
const s3 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  signatureVersion: "v4",
  region: "auto",
});

router.post("/generate", async (req, res) => {
  try {
    const { count = 20 } = req.query;

    const { rows: students } = await db.query(
      "SELECT * FROM studentVideos WHERE generated_audio_link IS NULL AND generated_script IS NOT NULL LIMIT $1",
      [count]
    );

    if (students.length === 0)
      return res.json({ message: "No students found needing audio." });

    (async () => {
      for (const student of students) {
        try {
          const script = student.generated_script;
          const studentName = student.name.replace(/\s+/g, "_");
          const timestamp = Date.now();
          const audioFilename = `${studentName}_${timestamp}.mp3`;
          const tempAudioPath = path.join(os.tmpdir(), audioFilename);

          // ElevenLabs request
          const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/Xb7hH8MSUJpSbSDYk0k2`,
            {
              text: script,
              model_id: "eleven_multilingual_v2",
              output_format: "mp3_44100_128",
            },
            {
              responseType: "arraybuffer",
              headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
            }
          );

          await fs.writeFile(tempAudioPath, response.data);

          // Upload to R2
          const objectKey = `audio/${audioFilename}`;
          await s3
            .putObject({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: objectKey,
              Body: await fs.readFile(tempAudioPath),
              ContentType: "audio/mpeg",
            })
            .promise();

          const uploadedUrl = `${process.env.CUSTOM_DOMAIN}${objectKey}`;

          // Update DB
          await db.query(
            "UPDATE studentVideos SET generated_audio_link=$1 WHERE student_id=$2",
            [uploadedUrl, student.student_id]
          );

          await fs.unlink(tempAudioPath);

          console.log(`[✅] Finished student: ${student.student_id}`);
        } catch (e) {
          console.error(
            `[❌] Error processing student ${student.student_id}:`,
            e
          );
        }
      }
    })();

    res.json({
      message: `Started audio generation for ${students.length} students.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start audio generation." });
  }
});

module.exports = router;
