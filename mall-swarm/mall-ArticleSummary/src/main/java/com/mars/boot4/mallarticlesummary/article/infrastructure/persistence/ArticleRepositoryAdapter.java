package com.mars.boot4.mallarticlesummary.article.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.article.domain.model.Article;
import com.mars.boot4.mallarticlesummary.article.domain.port.ArticleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 文章仓储适配器：实现领域端口，委托 ArticleMapper
 */
@Repository
public class ArticleRepositoryAdapter implements ArticleRepository {

    private final ArticleMapper articleMapper;

    @Autowired
    public ArticleRepositoryAdapter(ArticleMapper articleMapper) {
        this.articleMapper = articleMapper;
    }

    @Override
    public int save(Article article) {
        return articleMapper.insert(article);
    }

    @Override
    public int update(Article article) {
        return articleMapper.updateByPrimaryKeySelective(article);
    }

    @Override
    public Article findById(Long id) {
        return articleMapper.selectByPrimaryKey(id);
    }

    @Override
    public List<Article> findAll(String keyword, Integer status) {
        return articleMapper.selectListByPage(keyword, status);
    }

    @Override
    public int deleteById(Long id) {
        return articleMapper.deleteByPrimaryKey(id);
    }

    @Override
    public int deleteByIds(List<Long> ids) {
        return articleMapper.deleteByIds(ids);
    }

    @Override
    public int updateStatus(List<Long> ids, Integer status) {
        return articleMapper.updateStatusByIds(ids, status);
    }
}
