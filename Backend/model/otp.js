const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Otp",
  tableName: "otps",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    otp: { type: "varchar", nullable: false },
    email: { type: "varchar", nullable: false },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
    expiresAt: {
      type: "timestamp",
      nullable: false,
    },
  },
});
