const checkEmail = async (email) => {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      "16lCQ7F23kZGSZvER3JU9R-N8ivhQ5l_GBx2I5fJ5Lwk",
      serviceAccountAuth
    );

    
}

const Register = (req, res) => {
  // get required variables from request body
  // using es6 object destructing
  const { username, dob, city, ethnicity, email, password } = req.body;
  try {
    // create an instance of a user
    const newUser = {
      username,
      dob,
      city,
      ethnicity,
      email,
      password,
    };

    // Check if user already exists
    const existingUser = User.findOne({ email });
    if (existingUser)
      return res.status(400).json({
        status: "failed",
        data: [],
        message: "It seems you already have an account, please log in instead.",
      });
    const savedUser = newUser.save(); // save new user into the database
    const { role, ...user_data } = savedUser._doc;
    res.status(200).json({
      status: "success",
      data: [user_data],
      message:
        "Thank you for registering with us. Your account has been successfully created.",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      code: 500,
      data: [],
      message: "Internal Server Error",
    });
  }
  res.end();
};

module.exports = { Register };
