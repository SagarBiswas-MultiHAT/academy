import { PartialType } from '@nestjs/swagger';
import { CreateQuizQuestionDto } from './create-quiz.dto';

export class UpdateQuizDto extends PartialType(CreateQuizQuestionDto) {}
