package com.mars.boot4.mallarticlesummary.paper.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.paper.domain.model.Paper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 论文 MyBatis 映射接口
 */
@Mapper
public interface PaperMapper {

    int insert(Paper paper);

    int updateByPrimaryKeySelective(Paper paper);

    int deleteByPrimaryKey(Long id);

    int deleteByIds(@Param("ids") List<Long> ids);

    Paper selectByPrimaryKey(Long id);

    List<Paper> selectListByPage(@Param("keyword") String keyword, @Param("status") Integer status);

    int updateStatusByIds(@Param("ids") List<Long> ids, @Param("status") Integer status);
}
