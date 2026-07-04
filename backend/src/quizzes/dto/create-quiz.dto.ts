import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitQuizDto {
  @IsObject()
  selectedAnswers: Record<string, string>;
}

export class CreateQuizQuestionDto {
  @IsString()
  @MaxLength(120)
  bookSlug: string;

  @IsString()
  @MaxLength(2000)
  prompt: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  options: string[];

  @IsString()
  @MaxLength(500)
  correctAnswer: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateQuizQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prompt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  correctAnswer?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  sortOrder?: number;
}
