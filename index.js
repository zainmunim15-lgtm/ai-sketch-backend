import cors from "cors";
import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
const app = express();
app.use(cors());
const upload = multer({ dest: "/tmp" });

app.post("/sketch", upload.single("image"), async (req, res) => {
  try {
    // Baca file sementara
    const imageBase64 = fs.readFileSync(req.file.path, "base64");
    fs.unlinkSync(req.file.path); // hapus file sementara

    // Kirim request ke Replicate
    const create = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "c0a0baf2b3f5c9e4f7a6c6e91f5c3c8b",
        input: {
          image: `data:image/png;base64,${imageBase64}`,
          prompt: "realistic pencil sketch, hand drawn, ultra detailed"
        }
      })
    });

    let prediction = await create.json();

    // Polling sampai selesai
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(prediction.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });
      prediction = await poll.json();
    }

    if (prediction.status === "failed") {
      return res.status(500).json({ error: "AI gagal" });
    }

    res.json({ image: prediction.output[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});