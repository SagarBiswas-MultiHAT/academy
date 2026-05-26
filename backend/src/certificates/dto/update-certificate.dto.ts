import { PartialType } from '@nestjs/swagger';
import { CreateCertificateDto } from './create-certificate.dto';

export class UpdateCertificateDto extends PartialType(CreateCertificateDto) {}
