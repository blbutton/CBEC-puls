package com.mars.boot4.mallarticlesummary.article.interfaces;

import com.mars.boot4.mallarticlesummary.article.application.command.CreateArticleCommand;
import com.mars.boot4.mallarticlesummary.article.application.command.UpdateArticleCommand;
import com.mars.boot4.mallarticlesummary.article.application.dto.ArticleDto;
import com.mars.boot4.mallarticlesummary.article.domain.model.Article;
import com.mars.boot4.mallarticlesummary.article.interfaces.request.CreateArticleRequest;
import com.mars.boot4.mallarticlesummary.article.interfaces.request.UpdateArticleRequest;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

/**
 * 文章 Web 装配器：Request → Command，Entity → Dto
 */
@Component
public class ArticleWebAssembler {

    public CreateArticleCommand toCreateCommand(CreateArticleRequest request) {
        CreateArticleCommand command = new CreateArticleCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public UpdateArticleCommand toUpdateCommand(UpdateArticleRequest request) {
        UpdateArticleCommand command = new UpdateArticleCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public ArticleDto toDto(Article article) {
        ArticleDto dto = new ArticleDto();
        BeanUtils.copyProperties(article, dto);
        return dto;
    }
}
