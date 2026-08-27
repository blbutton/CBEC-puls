package com.mars.boot4.mallarticlesummary.member.application;

import com.github.pagehelper.PageHelper;
import com.mars.boot4.mallarticlesummary.member.application.command.CreateMemberCommand;
import com.mars.boot4.mallarticlesummary.member.application.command.UpdateMemberCommand;
import com.mars.boot4.mallarticlesummary.member.application.query.MemberQuery;
import com.mars.boot4.mallarticlesummary.member.domain.model.Member;
import com.mars.boot4.mallarticlesummary.member.domain.port.MemberRepository;
import com.mars.boot4.mallarticlesummary.shared.exception.EntityNotFoundException;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 会员用例编排服务
 */
@Service
public class MemberApplicationService {

    private final MemberRepository memberRepository;

    @Autowired
    public MemberApplicationService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public int create(CreateMemberCommand command) {
        Member member = new Member();
        BeanUtils.copyProperties(command, member);
        return memberRepository.save(member);
    }

    public int update(Long id, UpdateMemberCommand command) {
        Member member = new Member();
        BeanUtils.copyProperties(command, member);
        member.setId(id);
        return memberRepository.update(member);
    }

    public int delete(Long id) {
        return memberRepository.deleteById(id);
    }

    public int delete(List<Long> ids) {
        return memberRepository.deleteByIds(ids);
    }

    public List<Member> list(MemberQuery query) {
        PageHelper.startPage(query.getPageNum(), query.getPageSize());
        return memberRepository.findAll(query.getKeyword(), query.getStatus());
    }

    public Member get(Long id) {
        Member member = memberRepository.findById(id);
        if (member == null) {
            throw new EntityNotFoundException("会员", id);
        }
        return member;
    }

    public int updateStatus(List<Long> ids, Integer status) {
        return memberRepository.updateStatus(ids, status);
    }
}
