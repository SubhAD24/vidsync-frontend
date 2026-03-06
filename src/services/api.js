import axios from "axios";

// This is your new Render backend URL
const API_BASE_URL = "https://vidsync-backend-s1gm.onrender.com/api";

export const downloadVideo = async (url, quality) => {
  return axios.post(
    `${API_BASE_URL}/download`, // Points to Render now
    { url, quality },
    {
      responseType: "blob",
      timeout: 0   // Still important for long video processing!
    }
  );
};
