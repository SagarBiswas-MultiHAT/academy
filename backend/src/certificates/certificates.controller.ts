import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  getMyCertificates(@CurrentUser('id') userId: string) {
    return this.certificatesService.getMyCertificates(userId);
  }

  @Get('verify/:certId')  // Public — no auth required
  verifyCertificate(@Param('certId') certId: string) {
    return this.certificatesService.verifyCertificate(certId);
  }
}
