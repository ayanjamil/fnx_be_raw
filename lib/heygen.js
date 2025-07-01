const axios = require("axios");
const AWS = require("aws-sdk");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

// Setup R2 client
const s3 = new AWS.S3({
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  signatureVersion: "v4",
  region: "auto",
});

/**
 * Get Heygen Avatar ID by name
 * @param {string} targetName
 * @returns {Promise<string|null>}
 */
async function getAvatarId(targetName) {
  const url = "https://api.heygen.com/v2/avatars";
  const headers = {
    accept: "application/json",
    "x-api-key": process.env.HEYGEN_API_KEY,
  };

  try {
    const response = await axios.get(url, { headers });
    const avatars = response.data?.data?.avatars || [];

    for (const avatar of avatars) {
      if (
        (avatar.avatar_name || "").toLowerCase() === targetName.toLowerCase()
      ) {
        console.log(`[INFO] Avatar found: ${targetName}`);
        return avatar.avatar_id;
      }
    }

    console.warn(`[WARNING] Avatar ${targetName} not found.`);
    return null;
  } catch (error) {
    console.error(`[ERROR] Failed to retrieve avatars:`, error);
    return null;
  }
}

/**
 * Request Heygen to generate a video
 * @param {string} audioUrl
 * @param {string} avatarId
 * @param {Object} dimension
 * @param {boolean} caption
 * @returns {Promise<string|null>} Video ID
 */
async function generateVideo(
  audioUrl,
  avatarId,
  dimension = { width: 720, height: 1280 },
  caption = false
) {
  const url = "https://api.heygen.com/v2/video/generate";
  const payload = {
    caption,
    dimension,
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: avatarId,
          scale: 3.5,
          position: "center",
          offset: { x: 0.07 },
        },
        voice: {
          type: "audio",
          audio_url: audioUrl,
        },
      },
    ],
  };
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-key": process.env.HEYGEN_API_KEY,
  };

  console.log(`[INFO] Sending video generation request for audio: ${audioUrl}`);
  try {
    const response = await axios.post(url, payload, { headers });
    const data = response.data;

    if (data?.data?.video_id) {
      console.log(
        `[SUCCESS] Video generation started. Video ID: ${data.data.video_id}`
      );
      return data.data.video_id;
    } else {
      console.error(
        `[ERROR] Video generation failed: ${data?.message || "Unknown error"}`
      );
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Failed to generate video:`, error);
    return null;
  }
}

/**
 * Check status after ~8 minutes and download the video
 * @param {string} videoId
 * @returns {Promise<string|null>} R2 uploaded URL
 */
async function waitAndFetchVideo(videoId) {
  console.log(`[INFO] Waiting 8 minutes for video ID ${videoId}...`);
  await new Promise((resolve) => setTimeout(resolve, 8 * 60 * 1000)); // 8 minutes

  const url = `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`;
  const headers = {
    accept: "application/json",
    "x-api-key": process.env.HEYGEN_API_KEY,
  };

  console.log(`[INFO] Checking status for Video ID: ${videoId}`);
  try {
    const response = await axios.get(url, { headers });
    const data = response.data;

    if (data?.code === 100 && data.data?.status === "completed") {
      const videoUrl = data.data.video_url;
      console.log(`[SUCCESS] Video completed. Download link: ${videoUrl}`);

      // Download video to temp file
      const videoFilename = `heygen_${videoId}.mp4`;
      const tempVideoPath = path.join(os.tmpdir(), videoFilename);

      const videoResponse = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      await fs.writeFile(tempVideoPath, videoResponse.data);

      // Upload to R2
      const objectKey = `video/${videoFilename}`;
      await s3
        .putObject({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: await fs.readFile(tempVideoPath),
          ContentType: "video/mp4",
        })
        .promise();

      const uploadedUrl = `${process.env.R2_CUSTOM_DOMAIN}${objectKey}`;
      console.log(`[SUCCESS] Uploaded video to R2: ${uploadedUrl}`);

      await fs.unlink(tempVideoPath);

      return uploadedUrl;
    } else {
      console.log(
        `[INFO] Video still processing or failed: ${JSON.stringify(data)}`
      );
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Failed to check video status:`, error);
    return null;
  }
}

module.exports = {
  getAvatarId,
  generateVideo,
  waitAndFetchVideo,
};
