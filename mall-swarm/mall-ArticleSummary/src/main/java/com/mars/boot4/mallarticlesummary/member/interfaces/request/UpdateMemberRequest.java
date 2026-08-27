package com.mars.boot4.mallarticlesummary.member.interfaces.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Date;

@Data
public class UpdateMemberRequest {
    @NotEmpty @Schema(title = "用户名", required = true) private String username;
    @Schema(title = "手机号") private String phone;
    @Schema(title = "邮箱") private String email;
    @Schema(title = "头像") private String avatar;
    @Schema(title = "会员等级名称") private String level;
    @Schema(title = "等级编码") private String levelCode;
    @Schema(title = "状态:0禁用,1启用") private Integer status;
    @Schema(title = "订阅开始时间") private Date startTime;
    @Schema(title = "订阅到期时间") private Date expireTime;
    @Schema(title = "余额") private BigDecimal balance;
    @Schema(title = "积分") private Integer points;
    @Schema(title = "备注") private String remark;
}
