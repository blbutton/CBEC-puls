package com.mars.boot4.mallarticlesummary.member.interfaces;

import com.mars.boot4.mallarticlesummary.member.application.command.CreateMemberCommand;
import com.mars.boot4.mallarticlesummary.member.application.command.UpdateMemberCommand;
import com.mars.boot4.mallarticlesummary.member.application.dto.MemberDto;
import com.mars.boot4.mallarticlesummary.member.domain.model.Member;
import com.mars.boot4.mallarticlesummary.member.interfaces.request.CreateMemberRequest;
import com.mars.boot4.mallarticlesummary.member.interfaces.request.UpdateMemberRequest;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

/**
 * 会员 Web 装配器：Request → Command，Entity → Dto
 */
@Component
public class MemberWebAssembler {

    public CreateMemberCommand toCreateCommand(CreateMemberRequest request) {
        CreateMemberCommand command = new CreateMemberCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public UpdateMemberCommand toUpdateCommand(UpdateMemberRequest request) {
        UpdateMemberCommand command = new UpdateMemberCommand();
        BeanUtils.copyProperties(request, command);
        return command;
    }

    public MemberDto toDto(Member member) {
        MemberDto dto = new MemberDto();
        BeanUtils.copyProperties(member, dto);
        return dto;
    }
}
