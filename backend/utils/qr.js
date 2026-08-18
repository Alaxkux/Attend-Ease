const QRCode = require("qrcode");

async function generateQRDataURL(token, sessionId) {
  const payload = JSON.stringify({ token, sessionId, ts: Date.now() });
  return QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

module.exports = { generateQRDataURL };
