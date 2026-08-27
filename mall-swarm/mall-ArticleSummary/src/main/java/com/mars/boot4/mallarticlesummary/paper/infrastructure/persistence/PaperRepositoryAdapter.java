package com.mars.boot4.mallarticlesummary.paper.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.paper.domain.model.Paper;
import com.mars.boot4.mallarticlesummary.paper.domain.port.PaperRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 论文仓储适配器：实现领域端口，委托 PaperMapper
 */
@Repository
public class PaperRepositoryAdapter implements PaperRepository {

    private final PaperMapper paperMapper;

    @Autowired
    public PaperRepositoryAdapter(PaperMapper paperMapper) {
        this.paperMapper = paperMapper;
    }

    @Override
    public int save(Paper paper) {
        return paperMapper.insert(paper);
    }

    @Override
    public int update(Paper paper) {
        return paperMapper.updateByPrimaryKeySelective(paper);
    }

    @Override
    public Paper findById(Long id) {
        return paperMapper.selectByPrimaryKey(id);
    }

    @Override
    public List<Paper> findAll(String keyword, Integer status) {
        return paperMapper.selectListByPage(keyword, status);
    }

    @Override
    public int deleteById(Long id) {
        return paperMapper.deleteByPrimaryKey(id);
    }

    @Override
    public int deleteByIds(List<Long> ids) {
        return paperMapper.deleteByIds(ids);
    }

    @Override
    public int updateStatus(List<Long> ids, Integer status) {
        return paperMapper.updateStatusByIds(ids, status);
    }
}
