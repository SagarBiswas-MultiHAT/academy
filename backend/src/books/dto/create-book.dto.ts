import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChapterMetaDto {
  @IsNumber()
  index: number;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsBoolean()
  isFree: boolean;
}

export class CreateBookDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterMetaDto)
  chapterMetadata?: ChapterMetaDto[];
}
