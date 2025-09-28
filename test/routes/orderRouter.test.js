const request = require("supertest");
const app = require("../../src/service");
const {
  expectValidJwt,
  randomName,
  createAdminUser,
} = require("../../src/util/testHelper");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
const newItem = {
  title: randomName(),
  description: "No topping, no sauce, just carbs",
  image: "pizza9.png",
  price: 0.0001,
};

let adminUser;
let adminUserAuthToken;
let adminUserId;

const newFranchise = {
  name: randomName(),
  admins: [],
};
let newFranchiseId;

const newStore = {
  franchiseId: undefined,
  name: randomName(),
};
let newStoreId;

const newOrder = {
  franchiseId: undefined,
  storeId: undefined,
  items: [
    {
      menuId: undefined,
      description: newItem.description,
      price: newItem.price,
    },
  ],
};
let newOrderId;

beforeAll(async () => {
  testUser.name = randomName();
  testUser.email = testUser.name + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);

  adminUser = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  adminUserAuthToken = loginRes.body.token;
  expectValidJwt(adminUserAuthToken);
  adminUserId = loginRes.body.user.id;
  newFranchise.admins.push({ email: adminUser.email });

  const createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(newFranchise);
  expect(createFranchiseRes.status).toBe(200);
  newFranchiseId = createFranchiseRes.body.id;

  const createStoreRes = await request(app)
    .post(`/api/franchise/${newFranchiseId}/store`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(newStore);
  expect(createStoreRes.status).toBe(200);
  newStoreId = createStoreRes.body.id;

  newOrder.franchiseId = newFranchiseId;
  newOrder.storeId = newStoreId;
});

test("add item to pizza menu", async () => {
  // Non-admin cannot add items
  let addItemRes = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(newItem);
  expect(addItemRes.status).toBe(403);

  // Admin can add items
  addItemRes = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(newItem);
  expect(addItemRes.status).toBe(200);
  expect(addItemRes.body).toEqual(
    expect.arrayContaining([expect.objectContaining(newItem)]),
  );
  newOrder.items[0].menuId =
    addItemRes.body.find((item) => (item.title = newItem.title))?.id ?? -1;
});

test("get pizza menu", async () => {
  const getMenuRes = await request(app).get("/api/order/menu");
  expect(getMenuRes.status).toBe(200);
  expect(getMenuRes.body).toEqual(
    expect.arrayContaining([expect.objectContaining(newItem)]),
  );
});

test("create order", async () => {
  const createOrderRes = await request(app)
    .post("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(newOrder);
  expect(createOrderRes.status).toBe(200);
  expect(createOrderRes.body).toEqual(
    expect.objectContaining({
      order: expect.objectContaining({
        franchiseId: newFranchiseId,
        storeId: newStoreId,
        items: expect.arrayContaining([
          expect.objectContaining({ menuId: newOrder.items[0].menuId }),
        ]),
      }),
      jwt: expect.any(String),
    }),
  );
  expectValidJwt(createOrderRes.body.jwt);
  newOrderId = createOrderRes.body.order.id;
});

test("get order", async () => {
  const getOrderRes = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getOrderRes.status).toBe(200);
  expect(getOrderRes.body).toEqual(
    expect.objectContaining({
      orders: expect.arrayContaining([
        expect.objectContaining({
          id: newOrderId,
        }),
      ]),
    }),
  );
});
