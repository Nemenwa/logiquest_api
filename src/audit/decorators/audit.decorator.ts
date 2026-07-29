import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AUDIT_TARGET_ENTITY_KEY = 'audit_target_entity';

export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
export const AuditTargetEntity = (entity: string) => SetMetadata(AUDIT_TARGET_ENTITY_KEY, entity);
