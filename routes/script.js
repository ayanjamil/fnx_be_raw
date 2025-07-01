const express = require("express");
const db = require("../db"); // ✅ now it's Drizzle client
const { studentVideos } = require("../schema");
const { eq, isNull } = require("drizzle-orm");

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 20;

    const students = await db
      .select()
      .from(studentVideos)
      .where(isNull(studentVideos.generated_script))
      .limit(count);

    if (students.length === 0)
      return res.json({ message: "No students found needing scripts." });

    for (const student of students) {
      const script = `Hi ${student.name}, know you’ve been exploring your options in design ...`;

      await db
        .update(studentVideos)
        .set({ generated_script: script })
        .where(eq(studentVideos.student_id, student.student_id));
    }

    res.json({ message: `Generated scripts for ${students.length} students.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate scripts." });
  }
});

module.exports = router;
