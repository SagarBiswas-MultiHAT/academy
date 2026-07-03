import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

  @Get(':certId/pdf')
  async downloadCertificate(
    @Param('certId') certId: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const { buffer, filename } = await this.certificatesService.generatePrintableCertificate(certId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Get('verify/:certId')
  verifyCertificate(@Param('certId') certId: string) {
    return this.certificatesService.verifyCertificate(certId);
  }
}
