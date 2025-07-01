// schema.js
const { pgTable, text, timestamp } = require("drizzle-orm/pg-core");

const studentVideos = pgTable("student_videos", {
  student_id: text("student_id").primaryKey(),
  name: text("name").notNull(),
  branch: text("branch"),
  location: text("location"),
  generated_script: text("generated_script"),
  audio_avatar_id: text("audio_avatar_id"),
  video_avatar_id: text("video_avatar_id"),
  status: text("status").default("scripting").notNull(),
  generated_audio_link: text("generated_audio_link"),
  generated_video_link: text("generated_video_link"),
  generated_overlay_link: text("generated_overlay_link"),
  generated_transcription_link: text("generated_transcription_link"),
  final_video_link: text("final_video_link"),
  created_at: timestamp("created_at").defaultNow(),
});

module.exports = { studentVideos };
