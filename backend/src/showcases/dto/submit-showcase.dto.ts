import { IsEnum, IsString, IsUrl, MaxLength } from 'class-validator';
import { ShowcasePlatform } from '@prisma/client';

/**
 * Validated DTO for POST /showcases/submit
 *
 * Prevents SSRF by:
 * 1. Enforcing https-only URLs
 * 2. Restricting to a fixed set of known social platforms (via the platform enum)
 * 3. Limiting URL length to 2048 chars to prevent log flooding
 */
export class SubmitShowcaseDto {
  @IsString()
  certificateId: string;

  @IsEnum(ShowcasePlatform, {
    message: `platform must be one of: ${Object.values(ShowcasePlatform).join(', ')}`,
  })
  platform: ShowcasePlatform;

  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'postUrl must be a valid https:// URL' },
  )
  @MaxLength(2048)
  postUrl: string;
}
