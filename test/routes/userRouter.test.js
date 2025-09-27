const request = require('supertest');
const app = require('../../src/service');
const {expectValidJwt, createAdminUser, randomName} = require("../../src/util/testHelper");

let adminUser
let adminUserId
let adminUserAuthToken;

beforeAll(async () => {
    adminUser = await createAdminUser()
    const loginRes = await request(app).put('/api/auth').send(adminUser);
    adminUserId = loginRes.body.user.id
    adminUserAuthToken = loginRes.body.token;
    expectValidJwt(loginRes.body.token);
});

test('me', async () => {
    const meRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${adminUserAuthToken}`)
    expect(meRes.status).toBe(200)
    expect(meRes.body.name).toBe(adminUser.name)
    expect(meRes.body.roles[0].role).toBe('admin')
})

test('update user', async () => {
    const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    testUser.name = randomName()
    testUser.email = testUser.name + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    const testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);

    // Admin can update a different user
    testUser.name = randomName()
    const updateTestUserRes = await request(app).put(`/api/user/${registerRes.body.user.id}`)
        .set('Authorization', `Bearer ${adminUserAuthToken}`)
        .send(testUser)
    expect(updateTestUserRes.status).toBe(200)
    expect(updateTestUserRes.body.user.name).toBe(testUser.name)

    // Non-admin cannot update a different user
    const updateAdminUserRes = await request(app).put(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(adminUser)
    expect(updateAdminUserRes.status).toBe(403)
})