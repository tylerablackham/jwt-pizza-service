const request = require("supertest");
const app = require("../../src/service");
const {
  expectValidJwt,
  createAdminUser,
  randomName,
} = require("../../src/util/testHelper");

let adminUser;
let adminUserId;
let adminUserAuthToken;

const testUser = {
  name: "pizza diner",
  email: "reg@test.com",
  password: "a",
};
let testUserId;
let testUserAuthToken;

beforeAll(async () => {
  adminUser = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  adminUserId = loginRes.body.user.id;
  adminUserAuthToken = loginRes.body.token;
  expectValidJwt(adminUserAuthToken);

  testUser.name = randomName();
  testUser.email = testUser.name + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserId = registerRes.body.user.id;
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test("me", async () => {
  const meRes = await request(app)
    .get("/api/user/me")
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  expect(meRes.status).toBe(200);
  expect(meRes.body.name).toBe(adminUser.name);
  expect(meRes.body.roles[0].role).toBe("admin");
});

test("update user", async () => {
  // Admin can update a different user
  testUser.name = randomName();
  const updateTestUserRes = await request(app)
    .put(`/api/user/${testUserId}`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(testUser);
  expect(updateTestUserRes.status).toBe(200);
  expect(updateTestUserRes.body.user.name).toBe(testUser.name);

  // Non-admin cannot update a different user
  const updateAdminUserRes = await request(app)
    .put(`/api/user/${adminUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(adminUser);
  expect(updateAdminUserRes.status).toBe(403);
});

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);

  const listUsersRes2 = await request(app)
    .get("/api/user?page=1&limit=1")
    .set("Authorization", "Bearer " + testUserAuthToken);
  expect(listUsersRes2.status).toBe(403);
});

test("list users", async () => {
  const listUsersRes = await request(app)
    .get("/api/user?page=1&limit=1")
    .set("Authorization", "Bearer " + adminUserAuthToken);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body.users.length).toBe(1);
  expect(listUsersRes.body.more).toBe(true);
  const listUsersRes2 = await request(app)
    .get("/api/user?page=2&limit=1")
    .set("Authorization", "Bearer " + adminUserAuthToken);
  expect(listUsersRes2.status).toBe(200);
  expect(listUsersRes2.body.users.length).toBe(1);
  expect(listUsersRes2.body.users[0].id).not.toBe(
    listUsersRes.body.users[0].id,
  );
});
