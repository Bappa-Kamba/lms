const jwt = require("jsonwebtoken");
const api_key = require("../config/config");
const { OAuth2Client } = require("google-auth-library");
const AppDataSource = require("../config/data-source");
const userRepository = AppDataSource.getRepository("User");

const client = new OAuth2Client(api_key.googleAuth);

exports.googleSignUp = async (req, res, next) => {
  const { tokenId } = req.body;

  try {
    const response = await client.verifyIdToken({
      idToken: tokenId,
      audience: api_key.googleAuth,
    });
    const { email, email_verified, name } = response.payload;

    if (!email_verified) {
      return res
        .status(403)
        .json({ message: "Login failed, user not verified" });
    }

    // 1. Find User
    let user = await userRepository.findOne({ where: { email } });

    if (!user) {
      // NEW USER: Create account
      const hashedPassword = await bcrypt.hash(String(Math.random()), 12);

      const newUser = userRepository.create({
        email,
        password: hashedPassword,
        isverified: true,
        name,
        resetVerified: false,
      });
      user = await userRepository.save(newUser);

      res.status(201).json({ message: "User Account has been created" });
    }

    // EXISTING USER: Log in
    const access_token = jwt.sign(
      { email, userId: user.id },
      api_key.accessToken,
      { expiresIn: api_key.accessTokenLife }
    );
    const referesh_token = jwt.sign({ email }, api_key.refereshToken, {
      expiresIn: api_key.refereshTokenLife,
    });

    res.status(201).json({
      message: "User logged in!",
      access_token,
      referesh_token,
      username: user.name,
      userId: user.id,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
