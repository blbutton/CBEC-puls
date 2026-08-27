package com.mars.boot4.mallarticlesummary.news.domain.port;

import com.mars.boot4.mallarticlesummary.news.domain.model.News;

import java.util.List;

/**
 * 新闻仓储端口
 */
public interface NewsRepository {

    int save(News news);

    int update(News news);

    News findById(Long id);

    List<News> findAll(String keyword, Integer status);

    int deleteById(Long id);

    int deleteByIds(List<Long> ids);

    int updateStatus(List<Long> ids, Integer status);
}
