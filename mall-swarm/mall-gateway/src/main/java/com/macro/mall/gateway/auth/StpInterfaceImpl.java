package com.macro.mall.gateway.auth;

import cn.dev33.satoken.stp.StpInterface;
import cn.dev33.satoken.stp.StpUtil;
import com.macro.mall.common.constant.AuthConstant;
import com.macro.mall.common.dto.UserDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * 自定义权限验证接口扩展
 * <p>
 * 当 Sa-Token 需要获取某登录账号拥有的权限码列表时回调此接口。
 * <b>变更点</b>：新增 Session 为 null / 管理员信息为 null 时的空值保护，避免触发 NPE。
 * </p>
 *
 * @author macrozheng (original) / mall-gateway team
 */
@Slf4j
@Component
public class StpInterfaceImpl implements StpInterface {

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        // 仅后台用户（StpUtil 默认 loginType = "login"）需返回权限
        if (!StpUtil.getLoginType().equals(loginType)) {
            // 前台会员不需要细粒度权限码
            return Collections.emptyList();
        }
        try {
            Object sessionObj = StpUtil.getSession().get(AuthConstant.STP_ADMIN_INFO);
            if (sessionObj instanceof UserDto userDto && userDto.getPermissionList() != null) {
                return userDto.getPermissionList();
            }
            if (log.isDebugEnabled()) {
                log.debug("管理员登录会话中未找到 UserDto 或权限列表为空，loginId={}", loginId);
            }
        } catch (Exception ex) {
            // 捕获 Redis / Session 异常，降级返回空列表（不阻断鉴权流程）
            log.warn("读取管理员权限列表失败，降级返回空列表：{}", ex.getMessage());
        }
        return Collections.emptyList();
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        // 本项目暂未启用角色维度鉴权
        return Collections.emptyList();
    }
}
