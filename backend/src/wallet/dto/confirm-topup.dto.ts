import { IsString, Matches, MaxLength } from 'class-validator';

export class ConfirmTopUpDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^TOPUP-[A-Za-z0-9-]+$/)
  tranId: string;
}
