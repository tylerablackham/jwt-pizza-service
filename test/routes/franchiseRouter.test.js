const request = require('supertest');
const app = require('../../src/service');
const {expectValidJwt, createAdminUser, randomName} = require("../../src/util/testHelper");

let adminUser
let adminUserAuthToken;

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

const newFranchise = {
    name: randomName(),
    admins: []
}
let newFranchiseId

const newStore = {
    franchiseId: undefined,
    name: randomName()
}
let newStoreId

beforeAll(async () => {
    adminUser = await createAdminUser()
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    adminUserAuthToken = loginRes.body.token;
    expectValidJwt(adminUserAuthToken);
    newFranchise.admins.push({email: adminUser.email})

    testUser.name = randomName()
    testUser.email = testUser.name + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
});

test('create franchise', async () => {
    // Non-admin cannot create franchise
    let createFranchiseRes = await request(app).post('/api/franchise')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(newFranchise)
    expect(createFranchiseRes.status).toBe(403)

    // Admin can create franchise
    createFranchiseRes = await request(app).post('/api/franchise')
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(newFranchise)
    expect(createFranchiseRes.status).toBe(200)
    expect(createFranchiseRes.body.name).toBe(newFranchise.name)
    newFranchiseId = createFranchiseRes.body.id
})

test('get franchises', async () => {
    let getFranchisesRes = await request(app).get(`/api/franchise?page=0&limit=10&name=${newFranchise.name}`)
    expect(getFranchisesRes.status).toBe(200)
    expect(getFranchisesRes.body.franchises).toEqual(expect.arrayContaining([expect.objectContaining({name: newFranchise.name})]))
})

test('create store', async() => {
    newStore.franchiseId = newFranchiseId

    // Non-admin cannot create store
    let createStoreRes = await request(app).post(`/api/franchise/${newFranchiseId}/store`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(newStore)
    expect(createStoreRes.status).toBe(403)

    // Non-admin cannot create store
    createStoreRes = await request(app).post(`/api/franchise/${newFranchiseId}/store`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(newStore)
    expect(createStoreRes.status).toBe(200)
    expect(createStoreRes.body.name).toBe(newStore.name)
    newStoreId = createStoreRes.body.id
})