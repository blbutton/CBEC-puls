package com.mars.boot4.mallarticlesummary.paper.domain.port;

import com.mars.boot4.mallarticlesummary.paper.domain.model.Paper;

import java.util.List;

/**
 * 论文仓储端口
 */
public interface PaperRepository {

    int save(Paper paper);

    int update(Paper paper);

    Paper findById(Long id);

    List<Paper> findAll(String keyword, Integer status);

    int deleteById(Long id);

    int deleteByIds(List<Long> ids);

    int updateStatus(List<Long> ids, Integer status);
}
