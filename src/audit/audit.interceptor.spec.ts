import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: AuditService;

  const mockAuditService = {
    log: jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({}), 50))),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('interception filtering', () => {
    it('should bypass non-admin routes', async () => {
      const mockRequest = { url: '/public/puzzles', method: 'POST', user: { id: 'admin1' } };
      const context = createMockExecutionContext(mockRequest);
      const next: CallHandler = {
        handle: () => of({ test: true }),
      };

      await interceptor.intercept(context, next).toPromise();

      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('should bypass GET requests on admin routes', async () => {
      const mockRequest = { url: '/admin/users', method: 'GET', user: { id: 'admin1' } };
      const context = createMockExecutionContext(mockRequest);
      const next: CallHandler = {
        handle: () => of({ test: true }),
      };

      await interceptor.intercept(context, next).toPromise();

      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('should log mutating requests on admin routes', async () => {
      const mockRequest = {
        url: '/admin/users/123/ban',
        method: 'PATCH',
        params: { id: '123' },
        body: { reason: 'spam' },
        user: { id: 'admin1' },
      };
      
      const context = createMockExecutionContext(mockRequest, 'banUser');
      const next: CallHandler = {
        handle: () => of({ success: true, id: '123' }),
      };

      await interceptor.intercept(context, next).toPromise();

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'BAN_USER',
        'admin1',
        '123',
        'User',
        expect.objectContaining({ body: { reason: 'spam' } })
      );
    });

    it('should log even if user is anonymous', async () => {
      const mockRequest = {
        url: '/admin/users/123/ban',
        method: 'PATCH',
        params: { id: '123' },
        user: undefined,
      };
      
      const context = createMockExecutionContext(mockRequest, 'banUser');
      const next: CallHandler = {
        handle: () => of({ success: true }),
      };

      await interceptor.intercept(context, next).toPromise();

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'BAN_USER',
        'anonymous',
        '123',
        'User',
        expect.any(Object)
      );
    });
  });

  describe('non-blocking writes', () => {
    it('should complete interceptor call immediately without awaiting log write', async () => {
      const mockRequest = {
        url: '/admin/puzzle/approve',
        method: 'POST',
        params: { puzzleId: 'p1' },
        user: { id: 'admin1' },
      };
      const context = createMockExecutionContext(mockRequest, 'approvePuzzle');
      const next: CallHandler = {
        handle: () => of({ success: true }),
      };

      const startTime = Date.now();
      await interceptor.intercept(context, next).toPromise();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(35);
    });
  });

  describe('immutability checking', () => {
    it('should only expose GET route mappings on AuditController', () => {
      const methods = Object.getOwnPropertyNames(AuditController.prototype);
      
      for (const method of methods) {
        if (method === 'constructor') continue;
        const originalMethod = AuditController.prototype[method];
        const requestMethodCode = Reflect.getMetadata('method', originalMethod);
        if (requestMethodCode !== undefined) {
          expect(requestMethodCode).toBe(0);
        }
      }
    });
  });

  function createMockExecutionContext(req: any, handlerName = 'testHandler'): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getHandler: () => ({
        name: handlerName,
      }),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }
});
