import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost =
          configService.get<string>('REDIS_HOST') || 'localhost';
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        // Redis가 없는 환경에서는 메모리 캐시 사용
        if (configService.get<string>('NODE_ENV') === 'test') {
          return {
            ttl: 300000, // 5 minutes in milliseconds
            max: 100,
          };
        }

        try {
          return {
            store: await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              password: redisPassword || undefined,
              ttl: 300000, // 5 minutes in milliseconds
            }),
          };
        } catch (error) {
          console.warn(
            'Redis connection failed, falling back to memory cache:',
            error,
          );
          return {
            ttl: 300000,
            max: 100,
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
