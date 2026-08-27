package com.mars.boot4.mallarticlesummary.news.interfaces;

import com.mars.boot4.mallarticlesummary.news.application.command.CreateNewsCommand;
import com.mars.boot4.mallarticlesummary.news.application.command.UpdateNewsCommand;
import com.mars.boot4.mallarticlesummary.news.application.dto.NewsDto;
import com.mars.boot4.mallarticlesummary.news.domain.model.News;
import com.mars.boot4.mallarticlesummary.news.interfaces.request.CreateNewsRequest;
import com.mars.boot4.mallarticlesummary.news.interfaces.request.UpdateNewsRequest;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

/**
 * 新闻 Web 装配器：Request → Command，Entity → Dto
 */
@Component
public class NewsWebAssembler {

    public CreateNewsCommand toCreateCommand(CreateNewsRequest request) {
        CreateNewsCommand command = new CreateNewsCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public UpdateNewsCommand toUpdateCommand(UpdateNewsRequest request) {
        UpdateNewsCommand command = new UpdateNewsCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public NewsDto toDto(News news) {
        NewsDto dto = new NewsDto();
        BeanUtils.copyProperties(news, dto);
        return dto;
    }
}
