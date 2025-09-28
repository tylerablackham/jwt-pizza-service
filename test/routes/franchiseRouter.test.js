const request = require('supertest');
const app = require('../../src/service');
const {expectValidJwt, createAdminUser, randomName} = require("../../src/util/testHelper");
const {del} = require("express/lib/application");

let adminUser
let adminUserAuthToken;
let adminUserId

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
    adminUserId = loginRes.body.user.id
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

    // Admin can create store
    createStoreRes = await request(app).post(`/api/franchise/${newFranchiseId}/store`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(newStore)
    expect(createStoreRes.status).toBe(200)
    expect(createStoreRes.body.name).toBe(newStore.name)
    newStoreId = createStoreRes.body.id
})

test('get user franchises', async () => {
    // Non-admin cannot get user's franchises
    let userFranchisesRes = await request(app).get(`/api/franchise/${adminUserId}`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
    expect(userFranchisesRes.status).toBe(200)
    expect(userFranchisesRes.body.length).toBe(0)

    // Admin can get user's franchises
    userFranchisesRes = await request(app).get(`/api/franchise/${adminUserId}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
    expect(userFranchisesRes.status).toBe(200)
    expect(userFranchisesRes.body)
        .toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: newFranchise.name,
                stores: expect.arrayContaining([
                    expect.objectContaining({
                        name: newStore.name
                    })
                ]),
                admins: expect.arrayContaining([
                    expect.objectContaining({
                        name: adminUser.name})
                ])
            })
        ]))
})

test('delete store', async () => {
    // Non-admin cannot delete store
    let deleteStoreRes = await request(app).delete(`/api/franchise/${newFranchiseId}/store/${newStoreId}`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
    expect(deleteStoreRes.status).toBe(403)

    // Admin can delete store
    deleteStoreRes = await request(app).delete(`/api/franchise/${newFranchiseId}/store/${newStoreId}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
    expect(deleteStoreRes.status).toBe(200)
    expect(deleteStoreRes.body.message).toBe('store deleted')
})

test('deleteFranchise', async() => {
    // Non-admin cannot delete franchise
    let deleteStoreRes = await request(app).delete(`/api/franchise/${newFranchiseId}`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
    expect(deleteStoreRes.status).toBe(403)

    // Admin can delete store
    deleteStoreRes = await request(app).delete(`/api/franchise/${newFranchiseId}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
    expect(deleteStoreRes.status).toBe(200)
    expect(deleteStoreRes.body.message).toBe('franchise deleted')
})