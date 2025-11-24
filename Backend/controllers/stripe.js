const api_key = require("../config/config");
const stripe = require("stripe")(api_key.stripePayment);
const AppDataSource = require("../config/data-source");
const courseRepository = AppDataSource.getRepository("Course");

exports.stripeCourse = async (req, res, next) => {
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

exports.stripePayment = async (req, res, next) => {
  const { amount, id } = req.body;
  console.log(amount, id);

  try {
    const response = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
      description: "Coursera clone just testing",
      payment_method: id,
      confirm: true,
    });

    console.log(response);
    res.status(200).json({
      message: "Payment successful",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.json({
      message: "Payment Failed",
      success: false,
    });
    next(err);
  }
};
