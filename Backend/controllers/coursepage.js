const PDFDocument = require("pdfkit");
const AppDataSource = require("../config/data-source");
const courseRepository = AppDataSource.getRepository("Course");
const userRepository = AppDataSource.getRepository("User");

exports.CoursePage = async (req, res, next) => {
  const { courseId } = req.params;

  try {
    // TypeORM: findOneBy is used for finding by primary key (ID)
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

exports.Bookmark = async (req, res, next) => {
  const { courseId } = req.params;
  const { _userID: userId } = req.body;

  try {
    // 1. Find User and Course with relations (bookmarks for User, bookmarkUsers for Course)
    // NOTE: You must use the `relations` option to load the linked entities
    let [user, course] = await Promise.all([
      userRepository.findOne({
        where: { id: userId },
        relations: ["bookmarks"],
      }),
      courseRepository.findOne({
        where: { id: courseId },
        relations: ["bookmarkUsers"],
      }),
    ]);

    if (!user || !course) {
      return res.status(404).json({ message: "User or Course not found" });
    }

    // 2. Manage the Many-to-Many Relationship (User Side)
    const isBookmarkedByUser = user.bookmarks.some((b) => b.id === course.id);

    if (!isBookmarkedByUser) {
      // Add bookmark
      user.bookmarks.push(course);
      console.log("Added to bookmark for user");
    } else {
      // Remove bookmark
      user.bookmarks = user.bookmarks.filter((b) => b.id !== course.id);
      console.log("Removed from user bookmark");
    }

    // 3. Save the updated user (TypeORM handles the join table update automatically)
    await userRepository.save(user);

    res.status(200).json({
      message: isBookmarkedByUser
        ? "Course removed from bookmarks"
        : "Course added to bookmarks",
      isBookmarked: !isBookmarkedByUser,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.downloadCertificate = async (req, res, next) => {
  const { courseId } = req.params;

  try {
    const course = await courseRepository.findOneBy({ id: courseId });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const pdfName = "cert-" + courseId + ".pdf";
    const pdfPath = path.join("Files", pdfName);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="certificate.pdf"'
    );

    const pdfdoc = new PDFDocument();
    pdfdoc.pipe(fs.createWriteStream(pdfPath));
    pdfdoc.pipe(res);
    pdfdoc
      .fontSize(20)
      .text(
        "HERE ARE SOME DESCRIPTIONS AND TIPS ABOUT THE COURSE , HAVE A GREAT JOURNEY , EXPERIENCE BEST COURSES BY EXPERTES! THANK YOU"
      );
    pdfdoc.moveDown();
    pdfdoc.fontSize(18).text("---------------CREATOR------------------");
    pdfdoc.moveDown();
    pdfdoc.text(course.name);
    pdfdoc.moveDown();
    pdfdoc.fontSize(18).text("------------DESCRIPTION-------------");
    pdfdoc.moveDown();
    pdfdoc.text(course.discription);
    pdfdoc.moveDown();
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
    console.log(err);
    next(err);
  }
};
