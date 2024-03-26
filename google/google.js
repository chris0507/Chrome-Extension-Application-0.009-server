const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(
  "16lCQ7F23kZGSZvER3JU9R-N8ivhQ5l_GBx2I5fJ5Lwk",
  serviceAccountAuth
);

const connectSheet = async () => {
  await doc.loadInfo();
};

module.exports = {
  doc,
  connectSheet,
};
