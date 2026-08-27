package com.mars.boot4.mallarticlesummary.article.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.article.domain.model.Article;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 文章 MyBatis 映射接口
 */
@Mapper
public interface ArticleMapper {

    int insert(Article article);

    int updateByPrimaryKeySelective(Article article);

    int deleteByPrimaryKey(Long id);

    int deleteByIds(@Param("ids") List<Long> ids);

    Article selectByPrimaryKey(Long id);

    List<Article> selectListByPage(@Param("keyword") String keyword, @Param("status") Integer status);

    int updateStatusByIds(@Param("ids") List<Long> ids, @Param("status") Integer status);
}
