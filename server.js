const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const os = require("os");

const { PORT, SECRET_ACCESS_TOKEN } = require("./config/index.js");
const { connectSheet, doc } = require("./google/google.js");

const mailchimp = require("@mailchimp/mailchimp_transactional")(
  "mandrill_verify.L-oY8nbXlFuY98jrWNO6MQ"
);

const app = express();

app.use(cors());
app.disable("x-powered-by"); //Reduce fingerprinting
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//CONNECT DATABASE
connectSheet();

const saltRounds = 10;

const networkInterfaces = os.networkInterfaces();

const ipAddresses = [];

Object.keys(networkInterfaces).forEach((interfaceName) => {
  networkInterfaces[interfaceName].forEach((iface) => {
    if (iface.family === "IPv4" && !iface.internal) {
      ipAddresses.push(iface.address);
    }
  });
});

const generateAccessJWT = (email, ipAddresses) => {
  const secretKey = SECRET_ACCESS_TOKEN;
  const payload = {
    email,
    ipAddresses,
  };
  const options = {
    expiresIn: "1h", // Token expiration time
  };
  return jwt.sign(payload, secretKey, options);
};

//Public User
let logged_user = {
  username: "",
  email: "",
  password: "",
};

app.post("/register", async (req, res) => {
  const { username, dob, city, ethnicity, email, password } = req.body;
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  const data = [];
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  for (let row of rows) {
    if (email == row.get("email")) {
      return res.status(404).json({
        status: "existed_email",
        data: [],
        message: "It seems you already have an account, please log in instead.",
      });
    }
    // data.push({
    //   username: row.get("username"),
    //   dob: row.get("dob"),
    //   city: row.get("city"),
    //   ethnicity: row.get("ethnicity"),
    //   email: row.get("email"),
    //   password: row.get("password"),
    // });
  }
  // res.json({ data });
  await sheet.addRow({
    username: username,
    dob: dob,
    city: city,
    ethnicity: ethnicity,
    email: email,
    password: hashedPassword,
  });
  res.send("Successful Registered!");

  const message = {
    from_email: "info@financialcultures.com",
    subject: "Hello world",
    text: "Welcome to Mailchimp Transactional!",
    to: [
      {
        email: email,
        type: "to",
      },
    ],
  };
  const response = await mailchimp.messages.send({
    message,
  });
  // const response = await mailchimp.users.ping()
  console.log("mailchimp", response);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  logged_user.email = "";

  for (let row of rows) {
    if (email == row.get("email")) {
      logged_user.password = row.get("password");
      logged_user.email = row.get("email");
    }
  }

  if (logged_user.email == "") {
    return res.status(404).json({
      status: "noexist",
      data: [],
      message: "Account does not exist",
    });
  }
  const isPasswordValid = await bcrypt.compare(password, logged_user.password);

  if (!isPasswordValid) {
    return res.status(404).json({
      status: "wrongPassword",
      data: [],
      message: "Wrong password",
    });
  } else {
    const token = generateAccessJWT(logged_user.email, ipAddresses);

    res.status(200).json({
      status: "success",
      data: token,
      message: "Successfully login",
    });
  }
});

app.post("/check-token", async (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res.status(404).json({
      status: "null_token",
      data: [],
      message: "Token does not exist",
    });
  }
  await jwt.verify(token, SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err.message);
    } else {
      if (
        decoded.email == logged_user.email &&
        decoded.ipAddresses.join(", ") == ipAddresses.join(", ")
      ) {
        res.status(200).json({
          status: "public_verify_token",
          message: "Veritied token",
        });
      } else if (
        decoded.email == business_logged_user.email &&
        decoded.ipAddresses.join(", ") == ipAddresses.join(", ")
      ) {
        res.status(200).json({
          status: "business_verify_token",
          message: "Veritied token",
        });
      } else console.log("wrong");
    }
  });
});

//Business User
let business_logged_user = {
  email: "",
  password: "",
};

app.post("/business/login", async (req, res) => {
  const { email, password } = req.body;
  const businessSheet = doc.sheetsByIndex[1];
  const rows = await businessSheet.getRows();
  business_logged_user.email = "";
  
  for (let row of rows) {
    if (email == row.get("email")) {
      business_logged_user.password = row.get("password");
      business_logged_user.email = row.get("email");
    }
  }

  if (business_logged_user.email == "") {
    return res.status(404).json({
      status: "noexist",
      data: [],
      message: "Account does not exist",
    });
  }
  const isPasswordValid = await bcrypt.compare(
    password,
    business_logged_user.password
  );

  if (!isPasswordValid) {
    return res.status(404).json({
      status: "wrongPassword",
      data: [],
      message: "Wrong password",
    });
  } else {
    let options = {
      maxAge: 20 * 60 * 1000, // would expire in 20minutes
      httpOnly: true, // The cookie is only accessible by the web server
      secure: true,
      sameSite: "None",
    };

    const token = generateAccessJWT(business_logged_user.email, ipAddresses);
    // res.cookie("SessionID", token, options);

    res.status(200).json({
      status: "success",
      data: token,
      message: "Successfully login",
    });
  }
});

app.post("/business/register", async (req, res) => {
  const {
    brandName,
    city,
    baseCountry,
    CEOname,
    CEOemail,
    companyID,
    businessURL,
    logo,
    email,
    password,
  } = req.body;
  const sheet = doc.sheetsByIndex[1];
  const rows = await sheet.getRows();
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  for (let row of rows) {
    if (email == row.get("email")) {
      return res.status(404).json({
        status: "existed_email",
        data: [],
        message: "It seems you already have an account, please log in instead.",
      });
    }
  }

  await sheet.addRow({
    brandName: brandName,
    city: city,
    baseCountry: baseCountry,
    CEOname: CEOname,
    CEOemail: CEOemail,
    companyID: companyID,
    businessURL: businessURL,
    logo: logo,
    email: email,
    password: hashedPassword,
  });
  res.send("Successful Registered!");

  // const message = {
  //   from_email: "info@financialcultures.com",
  //   subject: "Hello world",
  //   text: "Welcome to Mailchimp Transactional!",
  //   to: [
  //     {
  //       email: email,
  //       type: "to",
  //     },
  //   ],
  // };
  // const response = await mailchimp.messages.send({
  //   message,
  // });
  // // const response = await mailchimp.users.ping()
  // console.log("mailchimp", response);
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
