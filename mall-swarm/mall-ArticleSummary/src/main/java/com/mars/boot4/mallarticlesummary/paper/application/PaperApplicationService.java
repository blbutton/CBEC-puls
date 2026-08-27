package com.mars.boot4.mallarticlesummary.paper.application;

import com.github.pagehelper.PageHelper;
import com.mars.boot4.mallarticlesummary.paper.application.command.CreatePaperCommand;
import com.mars.boot4.mallarticlesummary.paper.application.command.UpdatePaperCommand;
import com.mars.boot4.mallarticlesummary.paper.application.query.PaperQuery;
import com.mars.boot4.mallarticlesummary.paper.domain.model.Paper;
import com.mars.boot4.mallarticlesummary.paper.domain.port.PaperRepository;
import com.mars.boot4.mallarticlesummary.shared.exception.EntityNotFoundException;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 论文用例编排服务
 */
@Service
public class PaperApplicationService {

    private final PaperRepository paperRepository;

    @Autowired
    public PaperApplicationService(PaperRepository paperRepository) {
        this.paperRepository = paperRepository;
    }

    public int create(CreatePaperCommand command) {
        Paper paper = new Paper();
        BeanUtils.copyProperties(command, paper);
        return paperRepository.save(paper);
    }

    public int update(Long id, UpdatePaperCommand command) {
        Paper paper = new Paper();
        BeanUtils.copyProperties(command, paper);
        paper.setId(id);
        return paperRepository.update(paper);
    }

    public int delete(Long id) {
        return paperRepository.deleteById(id);
    }

    public int delete(List<Long> ids) {
        return paperRepository.deleteByIds(ids);
    }

    public List<Paper> list(PaperQuery query) {
        PageHelper.startPage(query.getPageNum(), query.getPageSize());
        return paperRepository.findAll(query.getKeyword(), query.getStatus());
    }

    public Paper get(Long id) {
        Paper paper = paperRepository.findById(id);
        if (paper == null) {
            throw new EntityNotFoundException("论文", id);
        }
        return paper;
    }

    public int updateStatus(List<Long> ids, Integer status) {
        return paperRepository.updateStatus(ids, status);
    }
}
