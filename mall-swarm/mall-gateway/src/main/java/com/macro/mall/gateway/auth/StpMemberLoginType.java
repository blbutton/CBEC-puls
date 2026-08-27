package com.macro.mall.gateway.auth;

import cn.dev33.satoken.SaManager;
import cn.dev33.satoken.jwt.StpLogicJwtForSimple;
import cn.dev33.satoken.stp.StpLogic;

/**
 * 前台商城会员登录类型常量与 StpLogic 访问器
 * <p>
 * 原 {@code StpMemberUtil} 是 1200+ 行的 StpUtil 镜像拷贝，违反 DRY 原则。
 * 此处精简为 < 50 行的类型安全 Wrapper，登录/登出/校验直接委托给 {@link StpLogic} 原生 API。
 * </p>
 *
 * @author mall-gateway team
 * @see StpLogic
 */
public final class StpMemberLoginType {

    private StpMemberLoginType() {
    }

    /** Sa-Token 多账号体系中会员类型标识 */
    public static final String TYPE = "memberLogin";

    /** 懒加载初始化 StpLogic（JWT Simple 模式） */
    private static volatile StpLogic instance;

    /**
     * 获取会员账号体系对应的 StpLogic
     * <p>首次调用时向 {@link SaManager} 注册 {@link StpLogicJwtForSimple}。</p>
     *
     * @return 会员 StpLogic 实例，永远非 null
     */
    public static StpLogic logic() {
        StpLogic cached = SaManager.getStpLogic(TYPE);
        if (cached != null) {
            return cached;
        }
        // DCL：保证首次注册线程安全
        if (instance == null) {
            synchronized (StpMemberLoginType.class) {
                if (instance == null) {
                    instance = new StpLogicJwtForSimple(TYPE);
                    SaManager.putStpLogic(instance);
                }
            }
        }
        return instance;
    }

    /** 快捷：会员登录校验（等价原 checkLogin） */
    public static void checkLogin() {
        logic().checkLogin();
    }

    /** 快捷：判断会员是否已登录 */
    public static boolean isLogin() {
        return logic().isLogin();
    }

    /** 快捷：获取当前会员登录 ID，未登录返回 null */
    public static Object getLoginIdDefaultNull() {
        return logic().getLoginIdDefaultNull();
    }

    /** 快捷：以会员身份执行登录 */
    public static void login(Object id) {
        logic().login(id);
    }

    /** 快捷：会员端登出 */
    public static void logout() {
        logic().logout();
    }
}
