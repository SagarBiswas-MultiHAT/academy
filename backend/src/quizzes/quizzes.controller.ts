import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Quizzes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get(':bookSlug/questions')
  getQuestions(@Param('bookSlug') bookSlug: string, @CurrentUser('id') userId: string) {
    return this.quizzesService.getQuestions(bookSlug, userId);
  }

  @Post(':bookSlug/submit')
  submitQuiz(
    @Param('bookSlug') bookSlug: string,
    @CurrentUser('id') userId: string,
    @Body('selectedAnswers') selectedAnswers: Record<string, string>,
  ) {
    return this.quizzesService.submitQuiz(bookSlug, userId, selectedAnswers);
  }
}
