const AppDataSource = require("../config/data-source");
const courseRepository = AppDataSource.getRepository("Course");
const userRepository = AppDataSource.getRepository("User");

exports.allCourses = async (req, res, next) => {
  try {
    // TypeORM: find() with no where clause fetches all
    const courses = await courseRepository.find();
    res.status(200).json({ course: courses });
  } catch (err) {
    next(err);
  }
};

exports.fetchCourses = async (req, res, next) => {
  const { course: category } = req.params;

  try {
    let courses;
    if (category === "all" || category === "") {
      courses = await courseRepository.find();
    } else {
      // TypeORM: find with a simple where clause
      courses = await courseRepository.find({ where: { category } });
    }
    res.status(200).json({ course: courses });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Error occurred" });
    next(err);
  }
};

exports.preferenceCourses = async (req, res, next) => {
  const { course: category } = req.params;
  const { userId } = req.body;

  if (category !== "preferences") {
    return next();
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
