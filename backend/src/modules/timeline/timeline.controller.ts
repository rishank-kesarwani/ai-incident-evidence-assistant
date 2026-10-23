import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTimelineEventDto, TimelineService } from './timeline.service';

@ApiTags('Timeline Correlation')
@Controller('incidents/:id/timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get()
  @ApiOperation({ summary: 'Get correlated chronological incident timeline' })
  async getTimeline(@Param('id') incidentId: string) {
    return this.timelineService.getTimeline(incidentId);
  }

  @Post()
  @ApiOperation({ summary: 'Manually append a timeline event' })
  async addEvent(
    @Param('id') incidentId: string,
    @Body() dto: CreateTimelineEventDto,
  ) {
    return this.timelineService.addEvent(incidentId, dto);
  }
}
