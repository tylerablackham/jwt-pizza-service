const request = require('supertest');
const app = require('../../src/service');
const {expectValidJwt, randomName} = require("../../src/util/testHelper");

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
    testUser.name = randomName()
    testUser.email = testUser.name + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);
});

test('login', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    expectValidJwt(loginRes.body.token);

    const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
    delete expectedUser.password;
    expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('logout', async () => {
    const badLogoutRes = await request(app).delete('/api/auth')
    expect(badLogoutRes.status).toBe(401)

    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`)
    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.message).toBe('logout successful')
})

test('register', async() => {
    const badRegisterRes = await request(app).post('/api/auth')
    expect(badRegisterRes.status).toBe(400)
})