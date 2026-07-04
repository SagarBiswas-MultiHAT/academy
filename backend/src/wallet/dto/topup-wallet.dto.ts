import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class TopUpWalletDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(100000)
  amountBdt: number;
}
