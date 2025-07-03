const express = require("express");
const { eq, isNull, isNotNull, and, not } = require("drizzle-orm");
const db = require("../db");
const { studentVideos } = require("../schema");
const { generateVideo, waitAndFetchVideo } = require("../lib/heygen");
const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 2;

    const students = await db
      .select()
      .from(studentVideos)
      .where(
        and(
          isNotNull(studentVideos.generated_audio_link),
          not(eq(studentVideos.generated_audio_link, "")), // ✅ Exclude empty strings
          isNull(studentVideos.generated_video_link)
        )
      )
      .limit(count);

    if (students.length === 0) {
      return res.json({
        message: "No students found needing video generation.",
      });
    }

    (async () => {
      for (const student of students) {
        console.log(
          `[DEBUG] Student ${student.student_id}: audio_link=${student.generated_audio_link}`
        );
        const videoId = await generateVideo(
          student.generated_audio_link,
          process.env.HEYGEN_AVATAR_ID
        );
        if (videoId) {
          const finalUrl = await waitAndFetchVideo(videoId);
          if (finalUrl) {
            await db
              .update(studentVideos)
              .set({ generated_video_link: finalUrl })
              .where(eq(studentVideos.student_id, student.student_id));
            console.log(
              `[✅] Video generated and uploaded for student: ${student.student_id}`
            );
          } else {
            console.log(
              `[⌛] Video for student ${student.student_id} not ready yet.`
            );
          }
        } else {
          console.error(
            `[❌] Video generation failed for student: ${student.student_id}`
          );
        }
      }
    })();

    res.json({
      message: `Started video generation for ${students.length} students.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to start video generation." });
  }
});

module.exports = router;
