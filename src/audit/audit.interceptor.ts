import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_ACTION_KEY, AUDIT_TARGET_ENTITY_KEY } from './decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const url = request.url || '';
    const isAdminRoute = url.startsWith('/admin') || url.startsWith('admin');
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

    if (!isAdminRoute || !isMutating) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const handler = context.getHandler();
          const actorId = request.user?.id || 'anonymous';
          
          let action = this.reflector.get<string>(AUDIT_ACTION_KEY, handler);
          if (!action) {
            const methodName = handler.name;
            action = methodName.replace(/([A-Z])/g, '_$1').toUpperCase();
          }

          let targetEntity = this.reflector.get<string>(AUDIT_TARGET_ENTITY_KEY, handler);
          if (!targetEntity) {
            if (url.includes('/users')) {
              targetEntity = 'User';
            } else if (url.includes('/submissions') || url.includes('/puzzles') || url.includes('/calibration')) {
              targetEntity = 'Puzzle';
            } else if (url.includes('/rewards')) {
              targetEntity = 'Reward';
            } else if (url.includes('/nft')) {
              targetEntity = 'Nft';
            } else if (url.includes('/sessions')) {
              targetEntity = 'Session';
            }
          }

          let targetId = request.params?.id || request.params?.puzzleId || request.params?.userId || request.params?.targetId;
          if (!targetId && request.body && request.body.id) {
            targetId = request.body.id;
          }
          if (!targetId && data && typeof data === 'object' && data.id) {
            targetId = data.id;
          }

          const payload = {
            body: request.body,
            query: request.query,
            params: request.params,
          };

          this.auditService.log(action, actorId, targetId, targetEntity, payload).catch((err) => {
            console.error('Failed to write audit log:', err);
          });
        },
      }),
    );
  }
}
