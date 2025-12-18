const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Course",
  tableName: "courses",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    title: { type: "varchar", nullable: false },
    category: { type: "varchar", nullable: false },
    imageurl: { type: "varchar", nullable: true },
    // authorName: { type: "varchar", nullable: false },
    willLearn: { type: "text", nullable: true },
    description: { type: "text", nullable: true },
    descriptionLong: { type: "text", nullable: true },
    requirement: { type: "text", nullable: true },
    price: { type: "decimal", precision: 10, scale: 2, nullable: true },
    resourcePath: { type: "varchar", nullable: true },

    // Flattened Rating Object
    ratingSum: { type: "int", default: 1 },
    timesUpdated: { type: "int", default: 1 },
    ratingFinal: { type: "decimal", precision: 3, scale: 2, default: 1.0 },

    createdAt: { type: "timestamp", createDate: true },
    updatedAt: { type: "timestamp", updateDate: true },
  },
  relations: {
    creator: {
      target: "User",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "createdCourses",
    },
    videos: {
      target: "Video",
      type: "one-to-many",
      inverseSide: "course",
      cascade: true,
    },
    bookmarkUsers: {
      target: "User",
      type: "many-to-many",
      inverseSide: "bookmarks",
    },
  },
});
