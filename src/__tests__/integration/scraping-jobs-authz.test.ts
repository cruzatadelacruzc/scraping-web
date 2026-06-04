import request from 'supertest';
import { App } from '../../main/app';

let app: any;

beforeAll(async () => {
  app = await new App().setup();
});

describe('POST /api/revolicos/scraping/jobs (authz)', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).post('/api/revolicos/scraping/jobs').send({ category: 'test' });
    expect(res.status).toBe(401);
  });

  it('should reject non-admin users', async () => {
    // Simula login de usuario client y obtiene token
    const loginRes = await request(app).post('/api/users/login').send({ email: 'client@example.com', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app).post('/api/revolicos/scraping/jobs').set('Authorization', `Bearer ${token}`).send({ category: 'test' });
    expect(res.status).toBe(403);
  });

  it('should allow admin users', async () => {
    // Simula login de usuario admin y obtiene token
    const loginRes = await request(app).post('/api/users/login').send({ email: 'admin@example.com', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app).post('/api/revolicos/scraping/jobs').set('Authorization', `Bearer ${token}`).send({ category: 'test' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('jobId');
  });
});
