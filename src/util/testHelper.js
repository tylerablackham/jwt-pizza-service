const { Role, DB } = require("../database/database.js");

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

const TEST_ADMIN_PASSWORD = "ThisIsNotSecret";

async function createAdminUser() {
  let user = { password: TEST_ADMIN_PASSWORD, roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  user = await DB.addUser(user);
  return { ...user, password: TEST_ADMIN_PASSWORD };
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/,
  );
}

module.exports = {
  randomName,
  createAdminUser,
  TEST_ADMIN_PASSWORD,
  expectValidJwt,
};
