package com.mars.boot4.mallarticlesummary.paper.interfaces;

import com.mars.boot4.mallarticlesummary.paper.application.command.CreatePaperCommand;
import com.mars.boot4.mallarticlesummary.paper.application.command.UpdatePaperCommand;
import com.mars.boot4.mallarticlesummary.paper.application.dto.PaperDto;
import com.mars.boot4.mallarticlesummary.paper.domain.model.Paper;
import com.mars.boot4.mallarticlesummary.paper.interfaces.request.CreatePaperRequest;
import com.mars.boot4.mallarticlesummary.paper.interfaces.request.UpdatePaperRequest;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

/**
 * 论文 Web 装配器：Request → Command，Entity → Dto
 */
@Component
public class PaperWebAssembler {

    public CreatePaperCommand toCreateCommand(CreatePaperRequest request) {
        CreatePaperCommand command = new CreatePaperCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public UpdatePaperCommand toUpdateCommand(UpdatePaperRequest request) {
        UpdatePaperCommand command = new UpdatePaperCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public PaperDto toDto(Paper paper) {
        PaperDto dto = new PaperDto();
        BeanUtils.copyProperties(paper, dto);
        return dto;
    }
}
