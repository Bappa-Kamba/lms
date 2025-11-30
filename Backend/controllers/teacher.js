const AppDataSource = require("../config/data-source");
const courseRepository = AppDataSource.getRepository("Course");
const videoRepository = AppDataSource.getRepository("Video");

exports.uploadCourse = async (req, res, next) => {
  const {
    title,
    category,
    name,
    willLearn,
    discription: description,
    discriptionLong: descriptionLong,
    requirement,
    price,
    _id: creatorId,
  } = req.body;
  const imageurl = req.file ? req.file.path : null;

  try {
    // TypeORM create and save
    const newCourse = courseRepository.create({
      title,
      category,
      imageurl,
      name,
      willLearn,
      description,
      descriptionLong,
      requirement,
      price,
      creator: creatorId,
    });

    const result = await courseRepository.save(newCourse);

    res
      .status(201)
      .json({ message: "Course created successfully", newCourse: result });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.uploadVideo = async (req, res, next) => {
  const { courseID: courseId } = req.params;
  const videos = req.files;

  try {
    // 1. Find the Course
    const course = await courseRepository.findOneBy({ id: courseId });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 2. Create Video Entities and save them
    const videoEntities = videos.map((file) =>
      videoRepository.create({
        videoUrl: file.path,
        title: file.originalname,
        course: course,
      })
    );

    // Save all new videos in a single transaction/batch
    await videoRepository.save(videoEntities);

    res.status(201).json({ message: "Videos uploaded successfully" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.deleteCourse = async (req, res, next) => {
  const { courseId } = req.body;

  try {
    // TypeORM delete call
    const result = await courseRepository.delete(courseId);

    if (result.affected === 0) {
      return res
        .status(404)
        .json({ message: "Course not found or already deleted." });
    }

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.editCourse = async (req, res, next) => {
  const { courseId } = req.body;

  try {
    const course = await courseRepository.findOneBy({ id: courseId });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ course });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  const {
    courseId,
    title,
    category,
    name,
    willLearn,
    discription,
    discriptionLong,
    requirement,
    price,
  } = req.body;
  const imageurl = req.file ? req.file.path : undefined;

  try {
    // 1. Find Course (or use update method if you don't need the entity instance)
    const course = await courseRepository.findOneBy({ id: courseId });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 2. Update properties
    course.title = title;
    course.category = category;
    if (imageurl) {
      course.imageurl = imageurl;
    }
    course.name = name;
    course.willLearn = willLearn;
    course.discription = discription;
    course.discriptionLong = discriptionLong;
    course.requirement = requirement;
    course.price = price;

    // 3. Save the updated entity
    await courseRepository.save(course);

    res.status(200).json({ message: "Course updated successfully" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
