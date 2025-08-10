const express = require("express");
const router = express.Router();
const DonationSettings = require("../Models/donationSettings");

console.log("🧩 donationSettings.js router loaded");

// GET current donation settings
router.get("/donations-settings", async (req, res) => {
  console.log("✅ GET /donations-settings route HIT");

  try {
    let settings = await DonationSettings.findOne();
    console.log("🔍 Fetched settings from DB:", settings);

    if (!settings) {
      console.log("⚠️ No settings found. Creating default...");
      settings = new DonationSettings({
        cryptoAddress: "",
        cashAppTag: "",
        zelleInfo: "",
        wireTransfer: "",
        paypalEmail: "", // ✅ CORRECT usage here (was: String)
      });
      await settings.save();
      console.log("✅ Default settings saved:", settings);
    }

    res.json(settings);
  } catch (error) {
    console.error("❌ Failed to fetch donation settings:", error);
    res.status(500).json({ error: "Failed to fetch donation settings" });
  }
});

// PUT update donation settings
router.put("/donations-settings", express.json(), async (req, res) => {
  console.log("✅ PUT /donations-settings route HIT");

  try {
    const { cryptoAddress, cashAppTag, zelleInfo, wireTransfer, paypalEmail } =
      req.body;
    console.log("📝 Received data:", req.body);

    // Validation
    if (
      typeof cryptoAddress !== "string" ||
      typeof cashAppTag !== "string" ||
      typeof zelleInfo !== "string" ||
      typeof wireTransfer !== "string" ||
      typeof paypalEmail !== "string"
    ) {
      console.warn("❌ Invalid input data types");
      return res.status(400).json({ error: "Invalid donation settings data" });
    }

    let settings = await DonationSettings.findOne();

    if (!settings) {
      console.log("⚠️ No settings found. Creating new one...");
      settings = new DonationSettings({
        cryptoAddress,
        cashAppTag,
        zelleInfo,
        wireTransfer,
        paypalEmail,
      });
    } else {
      settings.cryptoAddress = cryptoAddress;
      settings.cashAppTag = cashAppTag;
      settings.zelleInfo = zelleInfo;
      settings.wireTransfer = wireTransfer;
      settings.paypalEmail = paypalEmail;
    }

    await settings.save();
    console.log("✅ Settings updated/saved:", settings);

    res.json({ success: true, settings });
  } catch (error) {
    console.error("❌ Failed to update donation settings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
