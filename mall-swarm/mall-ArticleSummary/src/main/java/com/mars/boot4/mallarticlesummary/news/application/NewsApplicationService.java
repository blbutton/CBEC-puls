package com.mars.boot4.mallarticlesummary.news.application;

import com.github.pagehelper.PageHelper;
import com.mars.boot4.mallarticlesummary.news.application.command.CreateNewsCommand;
import com.mars.boot4.mallarticlesummary.news.application.command.UpdateNewsCommand;
import com.mars.boot4.mallarticlesummary.news.application.query.NewsQuery;
import com.mars.boot4.mallarticlesummary.news.domain.model.News;
import com.mars.boot4.mallarticlesummary.news.domain.port.NewsRepository;
import com.mars.boot4.mallarticlesummary.shared.exception.EntityNotFoundException;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 新闻用例编排服务
 */
@Service
public class NewsApplicationService {

    private final NewsRepository newsRepository;

    @Autowired
    public NewsApplicationService(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    public int create(CreateNewsCommand command) {
        News news = new News();
        BeanUtils.copyProperties(command, news);
        return newsRepository.save(news);
    }

    public int update(Long id, UpdateNewsCommand command) {
        News news = new News();
        BeanUtils.copyProperties(command, news);
        news.setId(id);
        return newsRepository.update(news);
    }

    public int delete(Long id) {
        return newsRepository.deleteById(id);
    }

    public int delete(List<Long> ids) {
        return newsRepository.deleteByIds(ids);
    }

    public List<News> list(NewsQuery query) {
        PageHelper.startPage(query.getPageNum(), query.getPageSize());
        return newsRepository.findAll(query.getKeyword(), query.getStatus());
    }

    public News get(Long id) {
        News news = newsRepository.findById(id);
        if (news == null) {
            throw new EntityNotFoundException("新闻", id);
        }
        return news;
    }

    public int updateStatus(List<Long> ids, Integer status) {
        return newsRepository.updateStatus(ids, status);
    }
}
