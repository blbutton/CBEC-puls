package com.mars.boot4.mallarticlesummary.article.application;

import com.github.pagehelper.PageHelper;
import com.mars.boot4.mallarticlesummary.article.application.command.CreateArticleCommand;
import com.mars.boot4.mallarticlesummary.article.application.command.UpdateArticleCommand;
import com.mars.boot4.mallarticlesummary.article.application.query.ArticleQuery;
import com.mars.boot4.mallarticlesummary.article.domain.model.Article;
import com.mars.boot4.mallarticlesummary.article.domain.port.ArticleRepository;
import com.mars.boot4.mallarticlesummary.shared.exception.EntityNotFoundException;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 文章用例编排服务
 */
@Service
public class ArticleApplicationService {

    private final ArticleRepository articleRepository;

    @Autowired
    public ArticleApplicationService(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public int create(CreateArticleCommand command) {
        Article article = new Article();
        BeanUtils.copyProperties(command, article);
        return articleRepository.save(article);
    }

    public int update(Long id, UpdateArticleCommand command) {
        Article article = new Article();
        BeanUtils.copyProperties(command, article);
        article.setId(id);
        return articleRepository.update(article);
    }

    public int delete(Long id) {
        return articleRepository.deleteById(id);
    }

    public int delete(List<Long> ids) {
        return articleRepository.deleteByIds(ids);
    }

    public List<Article> list(ArticleQuery query) {
        PageHelper.startPage(query.getPageNum(), query.getPageSize());
        return articleRepository.findAll(query.getKeyword(), query.getStatus());
    }

    public Article get(Long id) {
        Article article = articleRepository.findById(id);
        if (article == null) {
            throw new EntityNotFoundException("文章", id);
        }
        return article;
    }

    public int updateStatus(List<Long> ids, Integer status) {
        return articleRepository.updateStatus(ids, status);
    }
}
