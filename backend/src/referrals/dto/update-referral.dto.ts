import { PartialType } from '@nestjs/swagger';
import { CreateReferralDto } from './create-referral.dto';

export class UpdateReferralDto extends PartialType(CreateReferralDto) {}
