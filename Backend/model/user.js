const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    name: {
      type: "varchar",
      nullable: false,
    },
    email: {
      type: "varchar",
      unique: true,
      nullable: false,
    },
    password: {
      type: "varchar",
      nullable: false,
    },
    isverified: {
      type: "boolean",
      default: false,
    },
    resetVerified: {
      type: "boolean",
      default: false,
    },
    preferences: {
      type: "simple-array",
      nullable: true,
    },
  },
  relations: {
    createdCourses: {
      target: "Course",
      type: "one-to-many",
      inverseSide: "creator",
    },
    bookmarks: {
      target: "Course",
      type: "many-to-many",
      joinTable: { name: "user_bookmarks" },
      cascade: true,
    },
    videosWatched: {
      target: "Video",
      type: "many-to-many",
      joinTable: { name: "user_video_history" },
    },
  },
});
