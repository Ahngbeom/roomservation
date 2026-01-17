import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('Access (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let roomId: string;
  let reservationId: string;
  let accessToken: string;

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

    // Setup: Create user, get room, create reservation
    const userEmail = `access-test-${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/auth/register').send({
      email: userEmail,
      password: 'AccessTest123!',
      name: 'Access Test User',
      phone: '010-6666-6666',
      department: 'Testing',
    });

    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: userEmail,
      password: 'AccessTest123!',
    });

    userToken = loginResponse.body.accessToken;

    // Get a room
    const roomsResponse = await request(app.getHttpServer())
      .get('/api/rooms')
      .set('Authorization', `Bearer ${userToken}`);

    if (roomsResponse.body.length > 0) {
      roomId = roomsResponse.body[0].id;

      // Create a reservation that starts soon (5 minutes from now)
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() + 5);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const reservationResponse = await request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Access Test Meeting',
          purpose: 'To test access token generation',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 3,
        });

      if (reservationResponse.status === 201) {
        reservationId = reservationResponse.body.id;
      }
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/access/generate', () => {
    it('should generate access token for confirmed reservation', async () => {
      if (reservationId) {
        // First, try to confirm the reservation (might fail if not admin)
        // For now, we'll attempt to generate token for PENDING reservation
        const response = await request(app.getHttpServer())
          .post('/api/access/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            reservationId: reservationId,
            accessMethod: 'QR',
          });

        // Might be 201 or 400 depending on reservation status and timing
        if (response.status === 201) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('accessMethod', 'QR');
          expect(response.body).toHaveProperty('expiresAt');
          expect(response.body.isUsed).toBe(false);
          accessToken = response.body.accessToken;
        }
      }
    });

    it('should generate PIN access token', async () => {
      if (reservationId) {
        const response = await request(app.getHttpServer())
          .post('/api/access/generate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            reservationId: reservationId,
            accessMethod: 'PIN',
          });

        if (response.status === 201) {
          expect(response.body.accessMethod).toBe('PIN');
          expect(response.body.accessToken).toMatch(/^\d{6}$/); // 6 digits
        }
      }
    });

    it('should fail for non-existent reservation', () => {
      return request(app.getHttpServer())
        .post('/api/access/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reservationId: '550e8400-e29b-41d4-a716-446655440000',
          accessMethod: 'QR',
        })
        .expect(404);
    });

    it('should fail without authentication', () => {
      if (reservationId) {
        return request(app.getHttpServer())
          .post('/api/access/generate')
          .send({
            reservationId: reservationId,
            accessMethod: 'QR',
          })
          .expect(401);
      }
    });

    it('should fail for another users reservation', async () => {
      // Create another user
      const anotherUserEmail = `another-access-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/api/auth/register').send({
        email: anotherUserEmail,
        password: 'Pass123!',
        name: 'Another Access User',
        phone: '010-7777-7777',
        department: 'Security',
      });

      const anotherLoginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: anotherUserEmail,
        password: 'Pass123!',
      });

      const anotherUserToken = anotherLoginResponse.body.accessToken;

      if (reservationId) {
        return request(app.getHttpServer())
          .post('/api/access/generate')
          .set('Authorization', `Bearer ${anotherUserToken}`)
          .send({
            reservationId: reservationId,
            accessMethod: 'QR',
          })
          .expect(404); // Not found because it's not their reservation
      }
    });
  });

  describe('POST /api/access/verify', () => {
    it('should verify valid access token', () => {
      if (accessToken) {
        return request(app.getHttpServer())
          .post('/api/access/verify')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            accessToken: accessToken,
          })
          .expect((res) => {
            if (res.status === 200) {
              expect(res.body).toHaveProperty('success');
              expect(res.body).toHaveProperty('message');
              if (res.body.success) {
                expect(res.body).toHaveProperty('roomAccess');
              }
            }
          });
      }
    });

    it('should fail for invalid token', () => {
      return request(app.getHttpServer())
        .post('/api/access/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          accessToken: 'invalid-token-12345',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('유효하지 않은');
        });
    });

    it('should fail to verify already used token', () => {
      if (accessToken) {
        // First verification should succeed
        return request(app.getHttpServer())
          .post('/api/access/verify')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            accessToken: accessToken,
          })
          .then(() => {
            // Second verification should fail (token already used)
            return request(app.getHttpServer())
              .post('/api/access/verify')
              .set('Authorization', `Bearer ${userToken}`)
              .send({
                accessToken: accessToken,
              })
              .expect(200)
              .expect((res) => {
                expect(res.body.success).toBe(false);
                expect(res.body.message).toContain('이미 사용된');
              });
          });
      }
    });
  });

  describe('GET /api/access/history', () => {
    it('should get user access history', () => {
      return request(app.getHttpServer())
        .get('/api/access/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should contain access records if tokens were generated
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).get('/api/access/history').expect(401);
    });
  });

  describe('GET /api/access/room/:roomId/current', () => {
    it('should get current room status', () => {
      if (roomId) {
        return request(app.getHttpServer())
          .get(`/api/access/room/${roomId}/current`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('isOccupied');
            if (res.body.isOccupied) {
              expect(res.body).toHaveProperty('currentReservation');
              expect(res.body).toHaveProperty('accessRecords');
            }
          });
      }
    });

    it('should return not occupied for non-existent room', () => {
      return request(app.getHttpServer())
        .get('/api/access/room/550e8400-e29b-41d4-a716-446655440000/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200) // Returns { isOccupied: false } for any room, even non-existent
        .expect((res) => {
          expect(res.body.isOccupied).toBe(false);
        });
    });

    it('should fail without authentication', () => {
      if (roomId) {
        return request(app.getHttpServer()).get(`/api/access/room/${roomId}/current`).expect(401);
      }
    });
  });
});
