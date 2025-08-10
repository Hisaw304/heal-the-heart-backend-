const mongoose = require("mongoose");

const donationSettingsSchema = new mongoose.Schema(
  {
    cryptoAddress: {
      type: String,
      default: "",
    },
    cashAppTag: {
      type: String,
      default: "",
    },
    zelleInfo: {
      type: String,
      default: "",
    },
    wireTransfer: {
      type: String,
      default: "",
    },
    paypalEmail: {
      type: String,
      default: "", // ← NEW FIELD for PayPal
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DonationSettings", donationSettingsSchema);
