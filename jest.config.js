module.exports = {
  preset: "ts-jest",
  testMatch: ["**/test/*.+(ts|js)"],
  moduleFileExtensions: ["ts", "js"],
  testEnvironment: "node",
  "globals": {
    "ts-jest": {
      "tsConfig": "tsconfig.jest.json"
    }
  },
};
