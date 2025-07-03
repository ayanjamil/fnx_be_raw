const express = require("express");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const axios = require("axios");
const { eq, isNull, isNotNull, and } = require("drizzle-orm");
const db = require("../db");
const { studentVideos } = require("../schema");
const AWS = require("aws-sdk");

const router = express.Router();

// Setup R2 client
const s3 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  signatureVersion: "v4",
  region: "auto",
});

// 🚀 POST /api/audio/generate — Start audio generation
router.post("/generate", async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 20;

    // ✅ Drizzle select
    const students = await db
      .select()
      .from(studentVideos)
      .where(
        and(
          isNull(studentVideos.generated_audio_link),
          isNotNull(studentVideos.generated_script)
        )
      )
      .limit(count);

    if (students.length === 0) {
      return res.json({ message: "No students found needing audio." });
    }

    // 🚀 Run in background
    (async () => {
      for (const student of students) {
        try {
          const script = student.generated_script;
          const studentName = student.name.replace(/\s+/g, "_");
          const timestamp = Date.now();
          const audioFilename = `${studentName}_${timestamp}.mp3`;
          const tempAudioPath = path.join(os.tmpdir(), audioFilename);

          // 🗣️ ElevenLabs request
          const response = await axios.post(
            "https://api.elevenlabs.io/v1/text-to-speech/Xb7hH8MSUJpSbSDYk0k2",
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

          // ☁️ Upload to R2
          const objectKey = `audio/${audioFilename}`;
          await s3
            .putObject({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: objectKey,
              Body: await fs.readFile(tempAudioPath),
              ContentType: "audio/mpeg",
            })
            .promise();

          const uploadedUrl = `${process.env.R2_CUSTOM_DOMAIN}${objectKey}`;

          // 📝 Update DB with generated_audio_link
          await db
            .update(studentVideos)
            .set({ generated_audio_link: uploadedUrl })
            .where(eq(studentVideos.student_id, student.student_id));

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

    // ⏳ Immediately respond
    res.json({
      message: `Started audio generation for ${students.length} students.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start audio generation." });
  }
});

module.exports = router;
