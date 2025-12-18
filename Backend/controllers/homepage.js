const Course = require("../model/course");
const User = require("../model/user");
const AppDataSource = require("../config/data-source");

const courseRepository = AppDataSource.getRepository(Course);
const userRepository = AppDataSource.getRepository(User);

exports.allCourses = async (req, res) => {
  const courses = await courseRepository.find();
  console.log(courses);
  res.status(200).json({ course: courses });
};

// this fetches courses based on the category

exports.fetchCourses = async (req, res) => {
  const category = req.params.course;
  // if(category =="all" || category==""){

  const courseId = req.params.courseId;

  // Mongoose .findById().populate() -> TypeORM .findOne() with relations
  const course = await courseRepository.findOne({
    where: { id: courseId },
    relations: ["videos", "creator"], // Joins 'videos' and 'users' tables
  });

  if (!course) {
    return res.status(404).json({ msg: "Course not found" });
  }
  res.status(200).json({ course });

  // }
  // else{
  //     Course.find({category:category})
  //     .then(courses=>{
  //         //console.log(courses);
  //         res.status(200).json({course:courses})
  //     })
  //     .catch(err=>{
  //         console.log(err)
  //     })
  // }
};

exports.preferenceCourses = async (req, res, next) => {
  const { category } = req.params.course;
  const { userId } = req.body;
  if (category !== "preferences") {
    throw Error();
  }
  try {
    // 1. Find User and load preferences
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const preferences = user.preferences || [];
    if (preferences.length === 0) {
      return res.status(200).json({ course: [] });
    }

    // 2. Use Promise.all to fetch courses for all preferences in parallel
    const coursePromises = preferences.map((preference) =>
      courseRepository.find({ where: { category: preference } })
    );

    const results = await Promise.all(coursePromises);

    // 3. Flatten the array of arrays and send
    const courseArray = results.flat();
    res.status(200).json({ course: courseArray });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

// taking preferences from user

exports.getPreferences = async (req, res, next) => {
  const { interest: preferencesArray, userId } = req.body;

  try {
    // 1. Find User
    let user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Update preferences column and save
    user.preferences = preferencesArray;
    await userRepository.save(user);

    res.status(201).json({ message: "Preferences added successfully" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
