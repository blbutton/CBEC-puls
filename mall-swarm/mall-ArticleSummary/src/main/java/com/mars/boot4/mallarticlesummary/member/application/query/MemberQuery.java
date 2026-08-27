package com.mars.boot4.mallarticlesummary.member.application.query;

import lombok.Data;

@Data
public class MemberQuery {
    private String keyword;
    private Integer status;
    private Integer pageNum;
    private Integer pageSize;
}
