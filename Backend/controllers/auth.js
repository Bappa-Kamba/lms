const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const User = require('../model/user');
const Otp = require('../model/otp');
const nodemailer=require('nodemailer');
const sendgridTransport=require('nodemailer-sendgrid-transport');
const {validationResult}=require('express-validator')
const api_key = require('../config/config');
const AppDataSource = require("../config/data-source");

const userRepository = AppDataSource.getRepository("User");
const otpRepository = AppDataSource.getRepository("Otp");

// const transporter =nodemailer.createTransport(sendgridTransport({
//     auth:{
//         api_key:api_key.Sendgrid
//     }
// }))


exports.signup = async (req, res) => {
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

    const expirationTime = new Date(new Date().getTime() + 2 * 60 * 1000);
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

exports.otpVerification = async (req,res,next) => {
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

    if (Date.now() > otpEntity.expiresAt.getTime()) {
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

}

// to re send the otp to user
exports.resendOtp = (req,res,next)=>{
    const email=req.body.email;
    const received_otp=req.body.otp;
    let otp =null;

    Otp.findOne({email:email})
    .then(user=>{
        if(!user){
            const error = new Error("Email doesnt exist"); // when token not found
            error.statusCode = 401;
            error.data = {
            value: received_otp,
            message: "Invalid email",
            param: "otp",
            location: "otpVerification",
            };
            res.status(401).json({ message: "Email doesn't exist" });
            throw error;
        }
        otp=Math.floor(100000 + Math.random()*900000);

            user.otp=otp;
            user.save();
            console.log(otp);
            res.status(201).json({ message: "OTP sent to your Email" });
    })
    .then( ()=>{
      // transporter.sendMail({
      //     to:email,
      //     from:"ayush1911052@akgec.ac.in",
      //     subject:"OTP Verification",
      //     html:` '<h1>Please Verify your account using this OTP: !</h1>
      //             <p>OTP:${otp}</p>'`
      // })
      console.log("mail sent");
    })   

    .catch(err=>{
        err=>{
            if (!err.statusCode) {
                err.statusCode = 500;
              }
              next(err);
        }
    })
}



exports.login = async (req,res,next)=>{
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
}

exports.resetPassword = (req,res,next)=>{

    const email = req.body.email;
    console.log(email);
    let otp=Math.Math.floor(100000 + Math.random()*900000);

    User.findOne({email:email})
        .then(user=>{
        if(!user){
            const error = new Error("Validation Failed");
            error.statusCode = 401;
            res.status(401).json({ message: "user doesnt exists" });
            error.data = {
            value: email,
            message: " otp is incorrect"}
            res.status(422).json({message: " User doesn't exists" });
            throw error;
        }
        else{
            const new_otp = new Otp({
                otp:otp,
                email:email
            })
             new_otp.save()
        }
    })
       
        .then(result=>{
          // transporter.sendMail({
          //     to:email,
          //     from:"ayush1911052@akgec.ac.in",
          //     subject:"Reset Password for shelp",
          //     html:` '<h1>this is your otp to reset your password: ${otp}</h1>'`
          // })
          // console.log("mail sent  ",otp)
          res.status(201).json({ message: "otp sent to reset password" });
        })  
        .catch(err=>{
            if (!err.statusCode) {
                err.statusCode = 500;
              }
            next(err);
        })
}


exports.resetOtpVerification = (req,res,next)=>{
    const email=req.body.email;
    const otp=req.body.otp;
    console.log("reset::",otp);

    Otp.findOne({email:email})
    .then(user=>{
        if(!user){
            const error = new Error("Validation Failed");
            error.statusCode = 401;
            res.status(401).json({ message: "Otp is incorrect" });
            error.data = {
            value: email,
            message: " otp is incorrect"}
            res.status(422).json({message: " otp is incorrect or otp expired!" });
            throw error;
        }
       
         if(user.otp==otp){
            User.findOne({email:email})
            .then(matched=>{
                matched.resetVerified=true;
                matched.save();
            }) 
            res.status(201).json({ message: "Email verified successfully", email:email})
        }
        else res.status(402).json({ message: "Wrong Otp entered", email:email})   
    })
    .catch(err=>{
        if (!err.statusCode) {
            err.statusCode = 500;
          }
        next(err);
    })
}




exports.newPassword = (req,res,next)=>{
    const email=req.body.email;
    const newPassword = req.body.newPassword;
    const confirmPassword=req.body.confirmPassword;
    let resetUser;

    User.findOne({email:email})
    .then(user=>{

        if(!user){
            const error = new Error("user with this email doesnt exists");
            error.statusCode = 401;
            res.status(401).json({ message: "user with this email doesnt exists" });
            error.data = {
            value: email,
            message: "user with this email doesnt exists"}
            res.status(422).json({
                message: " User doesn't exists"
              });
            throw error;
        }
        if(user.resetVerified){
                resetUser=user;
                resetUser.resetVerified=false;
                return bcrypt.hash(newPassword,12)
                .then(hashedPassword=>{
                resetUser.password=hashedPassword;
                return resetUser.save();
                })

                .then(result=>{
                console.log("result",result)
                res.status(201).json({message:"password changed successfully"});
            })
                            }  // end of if condition

        else {
            console.log("Please,verify your email first")
            res.status(401).json({message:"Please,verify your email first "})
        }

 })
    .catch(err=>{
        if (!err.statusCode) {
            err.statusCode = 500;
          }
        next(err);
    })
    
}
