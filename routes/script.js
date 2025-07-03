const express = require("express");
const db = require("../db"); // ✅ Drizzle client
const { studentVideos } = require("../schema");
const { eq, isNull } = require("drizzle-orm");

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 20;

    // ✅ Fetch students immediately
    const students = await db
      .select()
      .from(studentVideos)
      .where(isNull(studentVideos.generated_script))
      .limit(count);

    if (students.length === 0) {
      return res.json({ message: "No students found needing scripts." });
    }

    // ✅ Send immediate response to client
    res.json({
      message: `Script generation started for ${students.length} students.`,
    });

    // ✅ Process scripts in the background
    (async () => {
      console.log(
        `[INFO] Starting script generation for ${students.length} students`
      );

      for (const student of students) {
        try {
          const script = `Hi ${student.name}, I know you’ve been exploring your options in design — and that’s exciting!
          At CODE, it’s not about lectures — it’s about you: real mentors, hands-on projects, and
          internships right from year one. Whether it’s UX, fashion, interiors, products or events — we
          help shape your creative path.
          And with CODE centers in जयपुर, इंदौर, मुंबई, पुणे, मथुरा and even दुबई — your journey can
          start wherever you are.
          Let’s DeCODE your future together!`;

          await db
            .update(studentVideos)
            .set({ generated_script: script })
            .where(eq(studentVideos.student_id, student.student_id));

          console.log(
            `[✅] Script generated for student: ${student.student_id}`
          );
        } catch (err) {
          console.error(
            `[❌] Failed to generate script for student ${student.student_id}:`,
            err
          );
        }
      }

      console.log(`[✅] Completed script generation for all students.`);
    })();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to initiate script generation." });
  }
});

module.exports = router;
