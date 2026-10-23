import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/create-incident.dto';
import { IncidentsService } from './incidents.service';

@ApiTags('Incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new incident with triage metadata' })
  async create(@Body() dto: CreateIncidentDto, @CurrentUser() user: any) {
    return this.incidentsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter incidents' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'environment', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('service') service?: string,
    @Query('environment') environment?: string,
    @Query('search') search?: string,
  ) {
    return this.incidentsService.findAll({
      status,
      severity,
      service,
      environment,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single incident' })
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update incident status or notes' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: any,
  ) {
    return this.incidentsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an incident (Operator privileges required)' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.incidentsService.delete(id, user);
  }
}
