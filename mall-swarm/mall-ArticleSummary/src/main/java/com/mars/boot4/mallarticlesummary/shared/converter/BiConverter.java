package com.mars.boot4.mallarticlesummary.shared.converter;

/**
 * 通用双向转换接口
 */
public interface BiConverter<S, T> {

    T to(S source);

    S from(T target);
}
