import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User as AuthUser } from '../auth/entities/user.entity';
import { User as UserUser, UserRole } from '../users/entities/user.entity';
import { Puzzle } from '../puzzles/entities/puzzle.entity';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  console.log('Starting database seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    const authUserRepo = dataSource.getRepository(AuthUser);
    const userUserRepo = dataSource.getRepository(UserUser);
    const puzzleRepo = dataSource.getRepository(Puzzle);

    // Seed Sample Users (Auth Users)
    const sampleAuthUsers = [
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        password: 'password123',
      },
      {
        username: 'admin_user',
        email: 'admin@example.com',
        password: 'adminpassword',
      },
    ];

    for (const u of sampleAuthUsers) {
      const exists = await authUserRepo.findOne({ where: { username: u.username } });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const user = authUserRepo.create({
          username: u.username,
          email: u.email,
          password: hashedPassword,
        });
        await authUserRepo.save(user);
        console.log(`Seeded auth user: ${u.username}`);
      } else {
        console.log(`Auth user ${u.username} already exists, skipping.`);
      }
    }

    // Seed Sample Users (User Users)
    const sampleUserUsers = [
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
        role: Role.USER,
        isBanned: false,
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        password: 'password123',
        role: Role.USER,
        isBanned: false,
      },
      {
        username: 'admin_user',
        email: 'admin@example.com',
        password: 'adminpassword',
        role: Role.ADMIN,
        isBanned: false,
      },
    ];

    for (const u of sampleUserUsers) {
      const exists = await userUserRepo.findOne({ where: { email: u.email } });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const user = userUserRepo.create({
          username: u.username,
          email: u.email,
          passwordHash: hashedPassword,
          role: u.role === Role.ADMIN ? UserRole.ADMIN : UserRole.PLAYER,
          isBanned: u.isBanned,
        });
        await userUserRepo.save(user);
        console.log(`Seeded user profile for: ${u.email}`);
      } else {
        console.log(`User profile for ${u.email} already exists, skipping.`);
      }
    }

    // Seed Sample Puzzles
    const samplePuzzles = [
      {
        title: 'The Enigma of LogiQuest',
        description: 'Crack the mysterious sequence of numbers to unlock the chamber.',
        difficulty: 'medium',
      },
      {
        title: 'Binary Bridge',
        description: 'Cross the bridge by decoding the 8-bit binary instructions.',
        difficulty: 'easy',
      },
      {
        title: 'Quantum Conundrum',
        description: 'Solve the quantum superposition puzzle where nodes can be 0, 1, or both.',
        difficulty: 'hard',
      },
    ];

    for (const p of samplePuzzles) {
      const exists = await puzzleRepo.findOne({ where: { title: p.title } });
      if (!exists) {
        const puzzle = puzzleRepo.create(p);
        await puzzleRepo.save(puzzle);
        console.log(`Seeded puzzle: ${p.title}`);
      } else {
        console.log(`Puzzle ${p.title} already exists, skipping.`);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
