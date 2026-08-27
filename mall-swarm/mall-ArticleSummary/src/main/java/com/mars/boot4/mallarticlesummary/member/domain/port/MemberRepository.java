package com.mars.boot4.mallarticlesummary.member.domain.port;

import com.mars.boot4.mallarticlesummary.member.domain.model.Member;

import java.util.List;

/**
 * 会员仓储端口
 */
public interface MemberRepository {

    int save(Member member);

    int update(Member member);

    Member findById(Long id);

    List<Member> findAll(String keyword, Integer status);

    int deleteById(Long id);

    int deleteByIds(List<Long> ids);

    int updateStatus(List<Long> ids, Integer status);
}
