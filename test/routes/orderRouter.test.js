const request = require('supertest');
const app = require('../../src/service');
const {expectValidJwt, randomName, createAdminUser} = require("../../src/util/testHelper");

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
const newItem = {
    title: randomName(),
    description: "No topping, no sauce, just carbs",
    image: "pizza9.png",
    price: 0.0001
}

beforeAll(async () => {
    testUser.name = randomName()
    testUser.email = testUser.name + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
});

test('add item to pizza menu', async () => {
    const adminUser = await createAdminUser()
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    const adminUserAuthToken = loginRes.body.token;
    expectValidJwt(adminUserAuthToken);

    // Non-admin cannot add items
    let addItemRes = await request(app).put('/api/order/menu')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(newItem)
    expect(addItemRes.status).toBe(403)

    // Admin can add items
    addItemRes = await request(app).put('/api/order/menu')
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(newItem)
    expect(addItemRes.status).toBe(200)
    expect(addItemRes.body).toEqual(expect.arrayContaining([expect.objectContaining(newItem)]))
})

test('get pizza menu', async () => {
    const getMenuRes = await request(app).get('/api/order/menu')
    expect(getMenuRes.status).toBe(200)
    expect(getMenuRes.body).toEqual(expect.arrayContaining([expect.objectContaining(newItem)]))
})