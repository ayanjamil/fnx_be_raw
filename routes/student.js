// routes/student.js
const express = require("express");
const router = express.Router();
const db = require("../db"); // ✅ import without destructuring
const { studentVideos } = require("../schema");
const { eq } = require("drizzle-orm");

// 📝 POST /api/student — Create student
router.post("/", async (req, res) => {
  const { student_id, name, branch, location } = req.body;
  try {
    await db.insert(studentVideos).values({
      student_id,
      name,
      branch,
      location,
      status: "scripting",
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to insert student" });
  }
});

// 📖 GET /api/student — Get all students
router.get("/", async (req, res) => {
  try {
    const students = await db.select().from(studentVideos);
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// 📖 GET /api/student/:studentId — Get single student by ID
router.get("/:studentId", async (req, res) => {
  const studentId = req.params.studentId;
  try {
    const student = await db
      .select()
      .from(studentVideos)
      .where(eq(studentVideos.student_id, studentId));

    if (!student || student.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch student" });
  }
});

// ✏️ PATCH /api/student/:studentId — Update student
router.patch("/:studentId", async (req, res) => {
  const studentId = req.params.studentId;
  const updates = req.body;
  try {
    const updated = await db
      .update(studentVideos)
      .set(updates)
      .where(eq(studentVideos.student_id, studentId));

    res.json({ updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update student" });
  }
});

// 🗑️ DELETE /api/student/:studentId — Delete student
router.delete("/:studentId", async (req, res) => {
  const studentId = req.params.studentId;
  try {
    const deleted = await db
      .delete(studentVideos)
      .where(eq(studentVideos.student_id, studentId));

    res.json({ deleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

module.exports = router;
