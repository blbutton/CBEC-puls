package com.mars.boot4.mallarticlesummary.news.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.news.domain.model.News;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 新闻 MyBatis 映射接口
 */
@Mapper
public interface NewsMapper {

    int insert(News news);

    int updateByPrimaryKeySelective(News news);

    int deleteByPrimaryKey(Long id);

    int deleteByIds(@Param("ids") List<Long> ids);

    News selectByPrimaryKey(Long id);

    List<News> selectListByPage(@Param("keyword") String keyword, @Param("status") Integer status);

    int updateStatusByIds(@Param("ids") List<Long> ids, @Param("status") Integer status);
}
