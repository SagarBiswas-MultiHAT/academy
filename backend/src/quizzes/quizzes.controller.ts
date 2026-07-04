import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { QuizzesService } from './quizzes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  CreateQuizQuestionDto,
  SubmitQuizDto,
  UpdateQuizQuestionDto,
} from './dto/create-quiz.dto';

@ApiTags('Quizzes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  // ─── Learner endpoints ────────────────────────────────────────────────────

  @Get(':bookSlug/questions')
  getQuestions(@Param('bookSlug') bookSlug: string, @CurrentUser('id') userId: string) {
    return this.quizzesService.getQuestions(bookSlug, userId);
  }

  @Post(':bookSlug/submit')
  submitQuiz(
    @Param('bookSlug') bookSlug: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizzesService.submitQuiz(bookSlug, userId, dto.selectedAnswers);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  /** GET /quizzes/admin/books — list all books (for book selector) */
  @Get('admin/books')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listAllBooks() {
    return this.quizzesService.listAllBooks();
  }

  /** GET /quizzes/admin/:bookSlug — list questions with correct answers */
  @Get('admin/:bookSlug')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listQuestionsAdmin(@Param('bookSlug') bookSlug: string) {
    return this.quizzesService.listQuestionsAdmin(bookSlug);
  }

  /** POST /quizzes/admin/questions — create a new question */
  @Post('admin/questions')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createQuestion(
    @Body() dto: CreateQuizQuestionDto,
  ) {
    return this.quizzesService.createQuestion(dto);
  }

  /** PATCH /quizzes/admin/questions/:id — update a question */
  @Patch('admin/questions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    return this.quizzesService.updateQuestion(id, dto);
  }

  /** DELETE /quizzes/admin/questions/:id — delete a question */
  @Delete('admin/questions/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteQuestion(@Param('id') id: string) {
    return this.quizzesService.deleteQuestion(id);
  }
}
