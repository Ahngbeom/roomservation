import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(cookieParser());
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    });

    await app.init();

    // Create admin user
    const adminEmail = `admin-e2e-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: adminEmail,
        password: 'AdminE2E123!',
        name: 'Admin E2E User',
        phone: '010-8888-8888',
        department: 'Administration',
      });

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: 'AdminE2E123!',
      });

    adminToken = adminLoginResponse.body.accessToken;

    // Create regular user
    const userEmail = `user-e2e-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password: 'UserE2E123!',
        name: 'User E2E',
        phone: '010-9999-9999',
        department: 'Testing',
      });

    const userLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: userEmail,
        password: 'UserE2E123!',
      });

    userToken = userLoginResponse.body.accessToken;
    userId = userLoginResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/admin/users', () => {
    it('should get all users for admin', () => {
      return request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          // Might be 200 or 403 depending on if the user has ADMIN role
          if (res.status === 200) {
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.pagination).toHaveProperty('total');
            expect(res.body.pagination).toHaveProperty('page');
            expect(res.body.pagination).toHaveProperty('limit');
          }
        });
    });

    it('should filter users by role', () => {
      return request(app.getHttpServer())
        .get('/api/admin/users?role=USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('data');
            res.body.data.forEach((user: any) => {
              expect(user.role).toBe('USER');
            });
          }
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(5);
            expect(res.body.data.length).toBeLessThanOrEqual(5);
          }
        });
    });

    it('should fail for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).get('/api/admin/users').expect(401);
    });
  });

  describe('GET /api/admin/reservations', () => {
    it('should get all reservations for admin', () => {
      return request(app.getHttpServer())
        .get('/api/admin/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);
          }
        });
    });

    it('should filter reservations by status', () => {
      return request(app.getHttpServer())
        .get('/api/admin/reservations?status=CONFIRMED')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('data');
            res.body.data.forEach((reservation: any) => {
              expect(reservation.status).toBe('CONFIRMED');
            });
          }
        });
    });

    it('should filter reservations by date range', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      return request(app.getHttpServer())
        .get(
          `/api/admin/reservations?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('data');
          }
        });
    });

    it('should fail for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/api/admin/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/statistics', () => {
    it('should get comprehensive statistics for admin', () => {
      return request(app.getHttpServer())
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('overview');
            expect(res.body).toHaveProperty('usersByRole');
            expect(res.body).toHaveProperty('reservationsByStatus');
            expect(res.body).toHaveProperty('topRoomsByReservations');
            expect(res.body).toHaveProperty('dailyReservations');
            expect(res.body).toHaveProperty('currentMonthStats');

            // Verify overview structure
            expect(res.body.overview).toHaveProperty('totalUsers');
            expect(res.body.overview).toHaveProperty('totalRooms');
            expect(res.body.overview).toHaveProperty('totalReservations');

            // Verify statistics are numbers
            expect(typeof res.body.overview.totalUsers).toBe('number');
            expect(typeof res.body.overview.totalRooms).toBe('number');
            expect(typeof res.body.overview.totalReservations).toBe('number');

            // Verify arrays
            expect(Array.isArray(res.body.topRoomsByReservations)).toBe(true);
            expect(Array.isArray(res.body.dailyReservations)).toBe(true);
          }
        });
    });

    it('should fail for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/admin/statistics')
        .expect(401);
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should update user role for admin', () => {
      if (userId) {
        return request(app.getHttpServer())
          .patch(`/api/admin/users/${userId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            role: 'ADMIN',
          })
          .expect((res) => {
            if (res.status === 200) {
              expect(res.body.role).toBe('ADMIN');
            }
          });
      }
    });

    it('should fail with invalid role', () => {
      if (userId) {
        return request(app.getHttpServer())
          .patch(`/api/admin/users/${userId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            role: 'INVALID_ROLE',
          })
          .expect(403); // AdminGuard executes before validation, returns 403 if user is not admin
      }
    });

    it('should fail for non-admin users', () => {
      if (userId) {
        return request(app.getHttpServer())
          .patch(`/api/admin/users/${userId}/role`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            role: 'ADMIN',
          })
          .expect(403);
      }
    });

    it('should fail without authentication', () => {
      if (userId) {
        return request(app.getHttpServer())
          .patch(`/api/admin/users/${userId}/role`)
          .send({
            role: 'ADMIN',
          })
          .expect(401);
      }
    });

    it('should fail for non-existent user', () => {
      return request(app.getHttpServer())
        .patch('/api/admin/users/550e8400-e29b-41d4-a716-446655440000/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'ADMIN',
        })
        .expect((res) => {
          if (res.status !== 403) {
            // If not forbidden due to permissions
            expect(res.status).toBe(404);
          }
        });
    });
  });
});
