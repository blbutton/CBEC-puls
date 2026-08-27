package com.mars.boot4.mallarticlesummary.news.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.news.domain.model.News;
import com.mars.boot4.mallarticlesummary.news.domain.port.NewsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 新闻仓储适配器：实现领域端口，委托 NewsMapper
 */
@Repository
public class NewsRepositoryAdapter implements NewsRepository {

    private final NewsMapper newsMapper;

    @Autowired
    public NewsRepositoryAdapter(NewsMapper newsMapper) {
        this.newsMapper = newsMapper;
    }

    @Override
    public int save(News news) {
        return newsMapper.insert(news);
    }

    @Override
    public int update(News news) {
        return newsMapper.updateByPrimaryKeySelective(news);
    }

    @Override
    public News findById(Long id) {
        return newsMapper.selectByPrimaryKey(id);
    }

    @Override
    public List<News> findAll(String keyword, Integer status) {
        return newsMapper.selectListByPage(keyword, status);
    }

    @Override
    public int deleteById(Long id) {
        return newsMapper.deleteByPrimaryKey(id);
    }

    @Override
    public int deleteByIds(List<Long> ids) {
        return newsMapper.deleteByIds(ids);
    }

    @Override
    public int updateStatus(List<Long> ids, Integer status) {
        return newsMapper.updateStatusByIds(ids, status);
    }
}
