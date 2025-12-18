const express = require('express');
const router= express.Router();
const multer = require('multer');
const teacherController =require('../controllers/teacher');
const Auth = require('../Authentication/is-auth');
const { v4: uuidv4 } = require("uuid");


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "image") {
      cb(null, "images");
    } else if (file.fieldname === "pdf") {
      cb(null, "pdfs");
    } else {
      cb(null, "videos");
    }
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "_" + file.originalname.replace(/[ -]/g, "_"));
  },
});
  
  
  
  const VideofileStorage = multer.diskStorage({
    destination:(req,file,cb)=>{
      cb(null,'videos');
    },
    filename: (req,file,cb)=>{
      cb(null, uuidv4() + '_' + file.originalname.replace(/[ -]/g,'_'));
    }
  })
  
  const VideofileFilter=(req,file,cb)=>{
    if(file.mimetype ==="video/mp4"){
      cb(null,true);
    }
    else {cb(null,false);
          console.log("wrong file type")}
  }
  

const upload = multer({ storage: storage });
const videoMulter=multer({storage:VideofileStorage,fileFilter:VideofileFilter}).any()

router.post(
  "/creator/create-course",
  upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf", maxCount: 2 }]),
  teacherController.uploadCourse
);
router.post('/creator/videoUpload/:courseID',videoMulter,teacherController.uploadVideo);
router.post('/creater/homepage',Auth.authentication,teacherController.teacherHome);
router.post('/course/delete',Auth.authentication,teacherController.deleteCourse);
router.post('/course/edit',Auth.authentication,teacherController.editCourse);
router.put('/course/Update',upload.fields([{ name: "image", maxCount: 1 }]),teacherController.updateCourse)
router.post('/watchedByuser',teacherController.watchedByUsers)

module.exports = router;
