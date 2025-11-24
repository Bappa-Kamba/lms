const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const api_key = require("../config/config");
const AppDataSource = require("../config/data-source");

// // 1. Setup Brevo (Sendinblue) Transporter
// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 587,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: api_key.BrevoUser, // Add your Brevo login email here
//     pass: api_key.BrevoPass, // Add your Brevo SMTP Key here
//   },
// });

const userRepository = AppDataSource.getRepository("User");
const otpRepository = AppDataSource.getRepository("Otp");

exports.signup = async (req, res, next) => {
  const { email, password, name } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: errors.array() });
  }

  try {
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = Math.floor(100000 + Math.random() * 900000);

    // 1. Create and save User
    const newUser = userRepository.create({
      email,
      password: hashedPassword,
      isverified: false,
      name,
      resetVerified: false,
    });
    await userRepository.save(newUser);

    const expirationTime = Date(new Date().getTime() + 2 * 60 * 1000);
    console.log(expirationTime);
    const newOtp = otpRepository.create({
      otp: String(otp),
      email,
      expiresAt: expirationTime,
    });
    await otpRepository.save(newOtp);

    // 3. Send Email
    // await transporter.sendMail({ /* ... email details ... */ });

    res.status(201).json({ message: "OTP sent to your Email" });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: errors.array() });
  }

  try {
    // TypeORM findOne call
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res
        .status(401)
        .json({ message: "A user with this email could not be found." });
    }

    if (!user.isverified) {
      return res
        .status(401)
        .json({ message: "Please verify your account first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const access_token = jwt.sign(
        { email, userId: user.id },
        api_key.accessToken,
        { expiresIn: api_key.accessTokenLife }
      );
      const referesh_token = jwt.sign({ email }, api_key.refereshToken, {
        expiresIn: api_key.refereshTokenLife,
      });

      res.status(200).json({
        message: "User logged in!",
        access_token,
        referesh_token,
        username: user.name,
        userId: user.id,
      });
    } else {
      res.status(401).json({ message: "Wrong password!" });
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.otpVerification = async (req, res, next) => {
  const { email, otp: receivedOtp } = req.body;

  try {
    // 1. Find OTP
    const otpEntity = await otpRepository.findOne({ where: { email } });

    if (!otpEntity) {
      return res.status(401).json({
        message: "OTP not found or expired. Please request a new one.",
      });
    }

    if (otpEntity.otp !== receivedOtp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    const expirationTime = new Date().getTime() + 2 * 60 * 1000;
    if (Date.now() > expirationTime) {
      await otpRepository.delete({ email });
      return res
        .status(401)
        .json({ message: "OTP expired. Please request a new one." });
    }

    // 2. Find and Update User
    let user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.isverified = true;
    await userRepository.save(user);

    // 3. Delete OTP
    await otpRepository.delete({ email });

    const access_token = jwt.sign(
      { email, userId: user.id },
      api_key.accessToken,
      { expiresIn: api_key.accessTokenLife }
    );
    const referesh_token = jwt.sign({ email }, api_key.refereshToken, {
      expiresIn: api_key.refereshTokenLife,
    });

    res.status(200).json({
      message: "User verified successfully",
      access_token,
      referesh_token,
      username: user.name,
      userId: user.id,
    });
  } catch (err) {
    next(err);
  }
};

exports.resendOtp = async (req, res, next) => {
  const { email } = req.body;

  try {
    // 1. Delete any existing OTP for cleanup
    await otpRepository.delete({ email });

    const otp = Math.floor(100000 + Math.random() * 900000);

    // 2. Create and save new OTP
    const newOtp = otpRepository.create({ otp: String(otp), email });
    await otpRepository.save(newOtp);

    // 3. Send Email
    // await transporter.sendMail({ /* ... email details ... */ });

    res.status(200).json({ message: "New OTP sent to your Email" });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    // 1. Check if user exists
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email does not exist" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    // 2. Delete existing OTP and create new one (using save to overwrite/create)
    await otpRepository.delete({ email });

    const newOtp = otpRepository.create({ otp: String(otp), email });
    await otpRepository.save(newOtp);

    // 3. Send Email
    // await transporter.sendMail({ /* ... email details ... */ });

    res
      .status(201)
      .json({ message: "OTP sent to your Email for password reset" });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  const { email, otp: receivedOtp } = req.body;

  try {
    // 1. Find OTP
    const otpEntity = await otpRepository.findOne({ where: { email } });

    if (!otpEntity) {
      return res.status(401).json({
        message: "OTP not found or expired. Please request a new one.",
      });
    }

    if (otpEntity.otp !== receivedOtp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // Check if OTP is expired (2 minute TTL logic)
    if (Date.now() > otpEntity.expiresAt) {
      await otpRepository.delete({ email });
      return res
        .status(401)
        .json({ message: "OTP expired. Please request a new one." });
    }

    // 2. Find and update User (set resetVerified to true)
    let user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.resetVerified = true;
    await userRepository.save(user);

    // 3. Delete OTP
    await otpRepository.delete({ email });

    res
      .status(200)
      .json({ message: "OTP verified. Proceed to set new password." });
  } catch (err) {
    next(err);
  }
};

exports.newPassword = async (req, res, next) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(422).json({ message: "Passwords do not match." });
  }

  try {
    // 1. Find User
    let user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this email doesn't exist" });
    }

    if (user.resetVerified) {
      // 2. Hash new password and update user entity
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      user.password = hashedPassword;
      user.resetVerified = false;
      await userRepository.save(user);

      res.status(201).json({ message: "Password changed successfully" });
    } else {
      res.status(401).json({
        message:
          "Please, verify your email first (via resetPassword endpoint).",
      });
    }
  } catch (err) {
    next(err);
  }
};
