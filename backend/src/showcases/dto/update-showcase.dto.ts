import { PartialType } from '@nestjs/swagger';
import { CreateShowcaseDto } from './create-showcase.dto';

export class UpdateShowcaseDto extends PartialType(CreateShowcaseDto) {}
