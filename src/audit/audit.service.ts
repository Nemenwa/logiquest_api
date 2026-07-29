import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  scrubPayload(val: any): any {
    if (val === null || val === undefined) {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.scrubPayload(item));
    }
    if (typeof val === 'object' && (val.constructor === Object || !val.constructor)) {
      const scrubbed: any = {};
      const sensitiveKeys = ['password', 'token', 'passwordhash', 'accesstoken', 'jwt', 'secret', 'authorization', 'signature'];
      for (const key of Object.keys(val)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
          scrubbed[key] = '[SCRUBBED]';
        } else {
          scrubbed[key] = this.scrubPayload(val[key]);
        }
      }
      return scrubbed;
    }
    return val;
  }

  async log(
    action: string,
    actorId: string,
    targetId?: string,
    targetEntity?: string,
    payload?: object,
  ): Promise<AuditLog> {
    const scrubbedPayload = payload ? this.scrubPayload(payload) : undefined;
    const log = this.auditLogRepository.create({
      action,
      actorId,
      targetId,
      targetEntity,
      payload: scrubbedPayload,
    });
    return this.auditLogRepository.save(log);
  }

  async findAll(query: {
    actor?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const where: FindOptionsWhere<AuditLog> = {};

    if (query.actor) {
      where.actorId = query.actor;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.startDate && query.endDate) {
      where.timestamp = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.timestamp = MoreThanOrEqual(new Date(query.startDate));
    } else if (query.endDate) {
      where.timestamp = LessThanOrEqual(new Date(query.endDate));
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { timestamp: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
