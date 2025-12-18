const { DataSource } = require("typeorm");
const UserEntity = require("../model/user");
const CourseEntity = require("../model/course");
const VideoEntity = require("../model/video");
const OtpEntity = require("../model/otp");

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_DB_HOST || "localhost",
  port: process.env.MYSQL_DB_PORT || 3306,
  username: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_DB_PASSWORD,
  database: process.env.MYSQL_DB_NAME,
  synchronize: process.env.NODE_ENV !== "dev" ? true : false,
  logging: false,
  entities: [UserEntity, CourseEntity, VideoEntity, OtpEntity],
});

module.exports = AppDataSource;
