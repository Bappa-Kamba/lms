const AppDataSource = require("../config/data-source");
const Course = require("../model/course");
const Video = require("../model/video");

const courseRepository = AppDataSource.getRepository("Course");
const videoRepository = AppDataSource.getRepository("Video");

exports.uploadCourse = async (req, res, next) => {
  const imageurl = req.files["image"] ? req.files["image"][0].path : null;
  const pdfUrl = req.files["pdf"] ? req.files["pdf"][0].path : null;
  const userId = req.body._id; // In MySQL, this is likely a number or UUID
  const {
    title,
    category,
    name,
    willLearn,
    discription,
    discriptionLong,
    requirement,
    price,
  } = req.body;

  try {
    const course = courseRepository.create({
      title,
      category,
      imageurl: imageurl,
      resourcePath: pdfUrl,
      name,
      willLearn,
      description: discription,
      descriptionLong: discriptionLong,
      requirement,
      rating: 0,
      price,
      creator: userId,
    });

    const result = await courseRepository.save(course);
    res
      .status(201)
      .json({ message: "Course created successfully", newCourse: result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Database error" });
  }
};

exports.uploadVideo = async (req, res, next) => {
  const courseId = req.params.courseID;
  const videos = req.files;

  try {
    const videoEntities = videos.map((video) => {
      return videoRepository.create({
        videoUrl: video.path,
        course: { id: courseId },
      });
    });

    await videoRepository.save(videoEntities);
    res.status(200).json({ message: "successfully saved the videos" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to upload videos" });
  }
};

exports.watchedByUsers = (req, res, next) => {
  const userId = req.body.userId;
  const videoId = req.body.videoId;
  const courseId = req.body.courseId;
  console.log(videoId);
  Course.findById({ _id: courseId })
    .then((course) => {
      course.videoContent.every((video) => {
        console.log(video);
        if (video._id == videoId) {
          if (!video.usersWatched.includes(userId)) {
            video.usersWatched.push(userId);
          }
          console.log("matched found");
          return false;
        }
        return true;
        console.log("ran");
      });
      course.save();
      console.log(course.videoContent);
      res.status(200).json({ message: "ko" });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.teacherHome = async (req, res, next) => {
  const userId = req.body.userId;
  try {
    const courses = await courseRepository.find({
      where: { creator: { id: userId } },
    });
    res.status(200).json({ data: courses });
  } catch (err) {
    console.log(err);
  }
};

exports.deleteCourse = async (req, res, next) => {
  const courseId = req.body.courseId;
  console.log(courseId);
  try {
    await courseRepository.delete(courseId);
    res.status(200).json({ message: "course deleted successfully" });
  } catch (err) {
    console.log(err);
  }
};

// editing course
exports.editCourse = async (req, res, next) => {
  const courseId = req.body.courseId;

  console.log(courseId);
  try {
    await courseRepository.findOneBy({ id: courseId });
    res.status(200).json({ message: "course deleted successfully" });
  } catch (err) {
    console.log(err);
  }
  
};

exports.updateCourse = (req, res, next) => {
  console.log(req.file);
  const courseId = req.body.courseId;
  const title = req.body.title;
  const category = req.body.category;
  const imageurl = req.file.path;
  const name = req.body.name;
  const willLearn = req.body.willLearn;
  const discription = req.body.discription;
  const discriptionLong = req.body.discriptionLong;
  const requirement = req.body.requirement;
  const price = req.body.price;
  //const userId=req.body._id;

  Course.findById({ _id: courseId })
    .then((course) => {
      course.title = title;
      course.category = category;
      course.imageurl = imageurl;
      course.name = name;
      course.willLearn = willLearn;
      course.discription = discription;
      course.discriptionLong = discriptionLong;
      course.requirement = requirement;
      //  course.rating=0;
      course.price = price;

      course.save();
      res
        .status(201)
        .json({ message: "Course editted successfully", course: course });
    })
    .catch((err) => {
      console.log(err);
    });
};
