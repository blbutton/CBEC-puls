package com.mars.boot4.mallarticlesummary.member.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.member.domain.model.Member;
import com.mars.boot4.mallarticlesummary.member.domain.port.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 会员仓储适配器：实现领域端口，委托 MemberMapper
 */
@Repository
public class MemberRepositoryAdapter implements MemberRepository {

    private final MemberMapper memberMapper;

    @Autowired
    public MemberRepositoryAdapter(MemberMapper memberMapper) {
        this.memberMapper = memberMapper;
    }

    @Override
    public int save(Member member) {
        return memberMapper.insert(member);
    }

    @Override
    public int update(Member member) {
        return memberMapper.updateByPrimaryKeySelective(member);
    }

    @Override
    public Member findById(Long id) {
        return memberMapper.selectByPrimaryKey(id);
    }

    @Override
    public List<Member> findAll(String keyword, Integer status) {
        return memberMapper.selectListByPage(keyword, status);
    }

    @Override
    public int deleteById(Long id) {
        return memberMapper.deleteByPrimaryKey(id);
    }

    @Override
    public int deleteByIds(List<Long> ids) {
        return memberMapper.deleteByIds(ids);
    }

    @Override
    public int updateStatus(List<Long> ids, Integer status) {
        return memberMapper.updateStatusByIds(ids, status);
    }
}
