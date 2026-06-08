import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<any, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: unknown): StreamableFile | ApiResponse<unknown> => {
        if (data instanceof StreamableFile) {
          return data;
        }

        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        return {
          data,
          message: 'Success',
          statusCode: response.statusCode,
        };
      }),
    );
  }
}
