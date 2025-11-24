const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Video",
  tableName: "videos",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    videoUrl: { type: "varchar", nullable: false },
    title: { type: "varchar", nullable: true },
  },
  relations: {
    course: {
      target: "Course",
      type: "many-to-one",
      inverseSide: "videos",
      onDelete: "CASCADE",
    },
    usersWatched: {
      target: "User",
      type: "many-to-many",
      inverseSide: "videosWatched",
    },
  },
});
