package com.macro.mall.gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.util.ArrayList;
import java.util.List;

/**
 * 请求体大小限制过滤器配置属性
 * <p>绑定前缀：{@code gateway.request}</p>
 *
 * @author mall-gateway team
 */
@Data
@ConfigurationProperties(prefix = "gateway.request")
public class RequestSizeProperties {

    /**
     * 最大请求体大小（MB），默认 10 MB
     */
    private int maxSizeMb = 10;

    /**
     * 豁免路径列表（AntPath 匹配，例如大文件上传接口）
     */
    private List<String> excludePaths = new ArrayList<>();

    /**
     * 获取最大字节数
     *
     * @return 字节数
     */
    public long getMaxSizeBytes() {
        return DataSize.ofMegabytes(maxSizeMb).toBytes();
    }
}
