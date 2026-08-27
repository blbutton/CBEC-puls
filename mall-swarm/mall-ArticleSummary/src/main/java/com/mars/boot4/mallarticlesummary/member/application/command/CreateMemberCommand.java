package com.mars.boot4.mallarticlesummary.member.application.command;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
public class CreateMemberCommand {
    private String username;
    private String phone;
    private String email;
    private String avatar;
    private String level;
    private String levelCode;
    private Integer status;
    private Date startTime;
    private Date expireTime;
    private BigDecimal balance;
    private Integer points;
    private String remark;
}
