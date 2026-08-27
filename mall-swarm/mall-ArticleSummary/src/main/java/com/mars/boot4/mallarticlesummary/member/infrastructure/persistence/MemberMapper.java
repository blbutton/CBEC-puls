package com.mars.boot4.mallarticlesummary.member.infrastructure.persistence;

import com.mars.boot4.mallarticlesummary.member.domain.model.Member;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 会员 MyBatis 映射接口
 */
@Mapper
public interface MemberMapper {

    int insert(Member member);

    int updateByPrimaryKeySelective(Member member);

    int deleteByPrimaryKey(Long id);

    int deleteByIds(@Param("ids") List<Long> ids);

    Member selectByPrimaryKey(Long id);

    List<Member> selectListByPage(@Param("keyword") String keyword, @Param("status") Integer status);

    int updateStatusByIds(@Param("ids") List<Long> ids, @Param("status") Integer status);
}
