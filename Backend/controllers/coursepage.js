const Course = require("../model/course");
const User = require("../model/user");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const AppDataSource = require("../config/data-source");

const courseRepository = AppDataSource.getRepository("Course");
const userRepository = AppDataSource.getRepository("User");

exports.CoursePage = async (req, res, next) => {
  const { courseId } = req.params;

  try {
    // TypeORM: findOneBy is used for finding by primary key (ID)
    const course = await courseRepository.findOne({
      where: { id: courseId },
      relations: ["creator", "videos"],
    });

    console.log("Course fetched:", course);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ course });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.Bookmark = async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.body._userID;

  try {
    // Load user with existing bookmarks relation
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ["bookmarks"],
    });
    const course = await courseRepository.findOneBy({ id: courseId });

    if (!user || !course)
      return res.status(404).json({ message: "User or Course not found" });

    // Check if course is already bookmarked
    const isBookmarked = user.bookmarks.some((c) => c.id == courseId);

    if (!isBookmarked) {
      user.bookmarks.push(course);
      console.log("Added to bookmarks");
    } else {
      user.bookmarks = user.bookmarks.filter((c) => c.id != courseId);
      console.log("Removed from bookmarks");
    }

    await userRepository.save(user); // TypeORM updates the Join Table automatically
    res.status(202).json({ message: "Successfully toggled bookmark" });
  } catch (err) {
    next(err);
  }
};

exports.ShowBookmark = async (req, res, next) => {
  const { userId } = req.params;
  try {
    // Mongoose: .populate("Bookmark") -> TypeORM: relations: ["bookmarks"]
    const userWithBookmarks = await userRepository.findOne({
      where: { id: userId },
      relations: ["bookmarks"],
    });

    res.json({ course: userWithBookmarks });
  } catch (err) {
    next(err);
  }
};

exports.unbookmark = async (req, res, next) => {
  const userId = req.body.userId;
  const courseId = req.body.id; // Original code used .id here

  try {
    // 1. Fetch the user and their existing bookmarks
    // Mongoose: User.findById({ _id: userId })
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ["bookmarks"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Filter out the course from the array
    // Mongoose: user.Bookmark.splice(user.Bookmark.indexOf(courseId), 1);
    const initialLength = user.bookmarks.length;
    user.bookmarks = user.bookmarks.filter((course) => course.id != courseId);

    if (user.bookmarks.length === initialLength) {
      return res.status(400).json({ message: "Course was not bookmarked" });
    }

    // 3. Save the User entity
    // TypeORM detects the missing course in the array and runs a SQL DELETE
    // on the join table automatically.
    await userRepository.save(user);

    res.status(200).json({ message: "successfully unbookmarked" });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.rating = async (req, res, next) => {
  const { courseId, rating: new_Rating } = req.body;

  try {
    const course = await courseRepository.findOneBy({ id: courseId });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // In MySQL, these are flat columns: course.ratingSum, course.timesUpdated, etc.
    course.ratingSum += new_Rating;
    course.timesUpdated += 1;
    course.ratingFinal = course.ratingSum / course.timesUpdated;

    await courseRepository.save(course);
    res.status(200).json({ course });
  } catch (err) {
    next(err);
  }
};

exports.pdf = async (req, res, next) => {
  const { courseId } = req.params;

  try {
    const course = await courseRepository.findOne({
      where: { id: courseId },
      relations: ["creator"],
    });
    console.log("Generating PDF for course:", course);
    if (!course)
      return res.status(404).json({ message: "Course doesn't exist!" });

    const pdfName = `invoice-${courseId}.pdf`;
    const pdfPath = path.join("Files", pdfName);
    const pdfdoc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${pdfName}"`);

    // Ensure the directory exists
    if (!fs.existsSync("Files")) fs.mkdirSync("Files");

    pdfdoc.pipe(fs.createWriteStream(pdfPath));
    pdfdoc.pipe(res);

    pdfdoc.fontSize(20).text("COURSE DESCRIPTION & TIPS");
    pdfdoc.moveDown().fontSize(18).text(`Creator: ${course.creator.name}`);
    pdfdoc.moveDown().text(`Description: ${course.description}`);
    pdfdoc.text("--------------------------------------------");
    pdfdoc.moveDown();
    pdfdoc.fontSize(18).text("TIPS");
    pdfdoc.text("--------------------------------------------");
    pdfdoc.text("1. Treat an online course like a “real” course.");
    pdfdoc.text("--------------------------------------------");
    pdfdoc.text("2. Hold yourself accountable");
    pdfdoc.text("--------------------------------------------");
    pdfdoc.text(" Practice time management.");
    pdfdoc.text("--------------------------------------------");
    pdfdoc.text("4. Create a regular study space and stay organized.");
    pdfdoc.text("--------------------------------------------");
    pdfdoc.text("5. Eliminate distractions.");
    pdfdoc.text("--------------------------------------------");
    pdfdoc.moveDown();
    pdfdoc.end();
  } catch (err) {
    next(err);
  }
};
