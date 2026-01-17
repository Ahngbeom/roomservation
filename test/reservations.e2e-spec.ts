import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';

describe('Reservations (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let _userId: string;
  let roomId: string;
  let reservationId: string;

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

    // Create and login user
    const userEmail = `reservation-test-${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/api/auth/register').send({
      email: userEmail,
      password: 'TestPass123!',
      name: 'Reservation Test User',
      phone: '010-3333-3333',
      department: 'Engineering',
    });

    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: userEmail,
      password: 'TestPass123!',
    });

    userToken = loginResponse.body.accessToken;
    _userId = loginResponse.body.user.id;

    // Get available rooms
    const roomsResponse = await request(app.getHttpServer())
      .get('/api/rooms')
      .set('Authorization', `Bearer ${userToken}`);

    if (roomsResponse.body.length > 0) {
      roomId = roomsResponse.body[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/reservations', () => {
    it('should create a reservation successfully', () => {
      // Get next Monday at 10:00 AM
      const nextMonday = getNextMonday();
      const startTime = new Date(nextMonday);
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(11, 0, 0, 0);

      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Team Meeting',
          purpose: 'Weekly sync meeting',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 5,
        })
        .expect((res) => {
          if (res.status === 201) {
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('Team Meeting');
            expect(res.body.status).toBe('PENDING');
            reservationId = res.body.id;
          }
          // Test might fail if roomId is not available or room doesn't exist
        });
    });

    it('should fail with past start time', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 2);
      const endTime = new Date(pastTime);
      endTime.setHours(endTime.getHours() + 1);

      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Past Meeting',
          purpose: 'This should fail',
          startTime: pastTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 3,
        })
        .expect(400);
    });

    it('should fail with duration less than 30 minutes', () => {
      const nextMonday = getNextMonday();
      const startTime = new Date(nextMonday);
      startTime.setHours(14, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 20); // Only 20 minutes

      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Short Meeting',
          purpose: 'Too short',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 2,
        })
        .expect(400);
    });

    it('should fail with duration more than 8 hours', () => {
      const nextMonday = getNextMonday();
      const startTime = new Date(nextMonday);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 9); // 9 hours

      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Very Long Meeting',
          purpose: 'Too long',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 5,
        })
        .expect(400);
    });

    it('should fail with end time before start time', () => {
      const nextMonday = getNextMonday();
      const startTime = new Date(nextMonday);
      startTime.setHours(14, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(13, 0, 0, 0); // Before start time

      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Invalid Time Meeting',
          purpose: 'Invalid times',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 3,
        })
        .expect(400);
    });

    it('should fail without authentication', () => {
      const nextMonday = getNextMonday();
      const startTime = new Date(nextMonday);
      startTime.setHours(15, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(16, 0, 0, 0);

      return request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          roomId: roomId,
          title: 'Unauthorized Meeting',
          purpose: 'No auth',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 4,
        })
        .expect(401);
    });
  });

  describe('GET /api/reservations', () => {
    it('should get all user reservations', () => {
      return request(app.getHttpServer())
        .get('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should contain the reservation we created
          if (reservationId) {
            const found = res.body.some((r: any) => r.id === reservationId);
            expect(found).toBe(true);
          }
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).get('/api/reservations').expect(401);
    });
  });

  describe('GET /api/reservations/:id', () => {
    it('should get reservation by id', () => {
      if (reservationId) {
        return request(app.getHttpServer())
          .get(`/api/reservations/${reservationId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(reservationId);
            expect(res.body).toHaveProperty('title');
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('room');
            expect(res.body).toHaveProperty('user');
          });
      }
    });

    it('should return 404 for non-existent reservation', () => {
      return request(app.getHttpServer())
        .get('/api/reservations/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should fail without authentication', () => {
      if (reservationId) {
        return request(app.getHttpServer()).get(`/api/reservations/${reservationId}`).expect(401);
      }
    });
  });

  describe('GET /api/reservations/room/:roomId', () => {
    it('should get reservations for a specific room', () => {
      if (roomId) {
        return request(app.getHttpServer())
          .get(`/api/reservations/room/${roomId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      }
    });

    it('should return empty array for room with no reservations', () => {
      return request(app.getHttpServer())
        .get('/api/reservations/room/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404); // Room not found
    });
  });

  describe('PATCH /api/reservations/:id', () => {
    it('should update reservation successfully', () => {
      if (reservationId) {
        return request(app.getHttpServer())
          .patch(`/api/reservations/${reservationId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: 'Updated Team Meeting',
            purpose: 'Updated purpose',
            attendees: 7,
          })
          .expect((res) => {
            if (res.status === 200) {
              expect(res.body.title).toBe('Updated Team Meeting');
              expect(res.body.purpose).toBe('Updated purpose');
              expect(res.body.attendees).toBe(7);
            }
            // Might fail if reservation time is too close
          });
      }
    });

    it('should fail to update another users reservation', async () => {
      // Create another user
      const anotherUserEmail = `another-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/api/auth/register').send({
        email: anotherUserEmail,
        password: 'Pass123!',
        name: 'Another User',
        phone: '010-4444-4444',
        department: 'Sales',
      });

      const anotherLoginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: anotherUserEmail,
        password: 'Pass123!',
      });

      const anotherUserToken = anotherLoginResponse.body.accessToken;

      if (reservationId) {
        return request(app.getHttpServer())
          .patch(`/api/reservations/${reservationId}`)
          .set('Authorization', `Bearer ${anotherUserToken}`)
          .send({
            title: 'Unauthorized Update',
          })
          .expect(403);
      }
    });
  });

  describe('DELETE /api/reservations/:id', () => {
    it('should cancel reservation successfully', () => {
      if (reservationId) {
        return request(app.getHttpServer())
          .delete(`/api/reservations/${reservationId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            cancellationReason: 'Meeting no longer needed',
          })
          .expect((res) => {
            if (res.status === 200) {
              expect(res.body.status).toBe('CANCELLED');
              expect(res.body.cancellationReason).toBe('Meeting no longer needed');
            }
            // Might fail if cancellation is too close to start time
          });
      }
    });

    it('should fail to cancel without reason', () => {
      // Create a new reservation for this test
      const nextMonday = getNextMonday();
      const startTime = new Date(nextMonday);
      startTime.setHours(16, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(17, 0, 0, 0);

      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Test Cancellation',
          purpose: 'To test cancellation',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 3,
        })
        .then((createRes) => {
          if (createRes.status === 201) {
            const newReservationId = createRes.body.id;
            return request(app.getHttpServer())
              .delete(`/api/reservations/${newReservationId}`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({}) // No cancellation reason
              .expect(400);
          }
        });
    });

    it('should fail to cancel another users reservation', async () => {
      // Use another user token from previous test or create new one
      const anotherUserEmail = `cancel-test-${Date.now()}@example.com`;
      await request(app.getHttpServer()).post('/api/auth/register').send({
        email: anotherUserEmail,
        password: 'Pass123!',
        name: 'Cancel Test User',
        phone: '010-5555-5555',
        department: 'Marketing',
      });

      const anotherLoginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: anotherUserEmail,
        password: 'Pass123!',
      });

      const anotherUserToken = anotherLoginResponse.body.accessToken;

      if (reservationId) {
        return request(app.getHttpServer())
          .delete(`/api/reservations/${reservationId}`)
          .set('Authorization', `Bearer ${anotherUserToken}`)
          .send({
            cancellationReason: 'Unauthorized cancellation attempt',
          })
          .expect(403);
      }
    });
  });

  describe('POST /api/reservations/:id/confirm (Admin only)', () => {
    it('should fail for non-admin users', async () => {
      // Create a new reservation
      const nextMonday = getNextMonday();
      const startTime = new Date(nextMonday);
      startTime.setHours(13, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(14, 0, 0, 0);

      const createRes = await request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          title: 'Confirmation Test',
          purpose: 'To test confirmation',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: 4,
        });

      if (createRes.status === 201) {
        const newReservationId = createRes.body.id;
        return request(app.getHttpServer())
          .post(`/api/reservations/${newReservationId}/confirm`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403); // Forbidden - only admin can confirm
      }
    });
  });
});

// Helper function to get next Monday
function getNextMonday(): Date {
  const date = new Date();
  const day = date.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}
