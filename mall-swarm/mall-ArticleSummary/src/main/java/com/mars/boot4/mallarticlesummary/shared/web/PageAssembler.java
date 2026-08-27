package com.mars.boot4.mallarticlesummary.shared.web;

import com.github.pagehelper.PageInfo;
import com.macro.mall.common.api.CommonPage;
import com.macro.mall.common.api.CommonResult;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 分页装配器：隔离 PageHelper + mall-common 的 CommonPage 构造
 */
public final class PageAssembler {

    private PageAssembler() {
    }

    /**
     * 不转换，直接包装 PageHelper 分页结果
     */
    public static <T> CommonResult<CommonPage<T>> page(List<T> list) {
        return CommonResult.success(CommonPage.restPage(list));
    }

    /**
     * 在保留分页元数据(总条数/页数)的前提下，将实体列表映射为 DTO 列表
     */
    public static <T, R> CommonResult<CommonPage<R>> page(List<T> list, Function<T, R> mapper) {
        PageInfo<T> pageInfo = new PageInfo<>(list);
        CommonPage<R> result = new CommonPage<>();
        result.setTotalPage(pageInfo.getPages());
        result.setPageNum(pageInfo.getPageNum());
        result.setPageSize(pageInfo.getPageSize());
        result.setTotal(pageInfo.getTotal());
        result.setList(list.stream().map(mapper).collect(Collectors.toList()));
        return CommonResult.success(result);
    }
}
