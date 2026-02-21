import axios from "axios";

export const downloadVideo = async (url, quality) => {
  return axios.post(
    "http://localhost:5000/api/download",
    { url, quality },
    {
      responseType: "blob",
      timeout: 0   // VERY IMPORTANT
    }
  );
};
