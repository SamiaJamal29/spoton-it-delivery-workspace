import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { ScoreController } from './score/score.controller';
import { ScoreService } from './score/score.service';
import { ItWorkspaceController } from './it-workspace/it-workspace.controller';
import { ItWorkspaceService } from './it-workspace/it-workspace.service';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { WorkItem } from './database/work-item.entity';
import { QaCheck } from './database/qa-check.entity';
import { Release } from './database/release.entity';
import { ScoreEvent } from './database/score-event.entity';
import { WorkItemsController } from './work-items/work-items.controller';
import { WorkItemsService } from './work-items/work-items.service';
import { QaChecksController } from './qa-checks/qa-checks.controller';
import { QaChecksService } from './qa-checks/qa-checks.service';
import { ReleasesController } from './releases/releases.controller';
import { ReleasesService } from './releases/releases.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '8h' },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_NAME ?? 'spoton_challenge',
      entities: [WorkItem, QaCheck, Release, ScoreEvent],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([WorkItem, QaCheck, Release, ScoreEvent]),
  ],
  controllers: [
    HealthController,
    AuthController,
    ScoreController,
    ItWorkspaceController,
    WorkItemsController,
    QaChecksController,
    ReleasesController,
  ],
  providers: [
    AuthService,
    ScoreService,
    ItWorkspaceService,
    JwtAuthGuard,
    WorkItemsService,
    QaChecksService,
    ReleasesService,
  ],
})
export class AppModule {}
