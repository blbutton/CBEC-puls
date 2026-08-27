package com.mars.boot4.mallarticlesummary.article.domain.port;

import com.mars.boot4.mallarticlesummary.article.domain.model.Article;

import java.util.List;

/**
 * 文章仓储端口
 */
public interface ArticleRepository {

    int save(Article article);

    int update(Article article);

    Article findById(Long id);

    List<Article> findAll(String keyword, Integer status);

    int deleteById(Long id);

    int deleteByIds(List<Long> ids);

    int updateStatus(List<Long> ids, Integer status);
}
