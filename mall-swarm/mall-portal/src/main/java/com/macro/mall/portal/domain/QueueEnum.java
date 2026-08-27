package com.macro.mall.portal.domain;

import lombok.Getter;

/**
 * 消息队列枚举配置
 * <p>
 * 已从 RabbitMQ 迁移至 Kafka（KRaft 模式）。
 * 原 exchange/routeKey 字段保留用于日志/兼容，实际 Kafka 仅用 topic + consumerGroup。
 *
 * @auther macrozheng
 * @github https://github.com/macrozheng
 */
@Getter
public enum QueueEnum {
    /**
     * 取消订单消费 Topic
     */
    QUEUE_ORDER_CANCEL("mall.order.cancel", "mall.order.cancel", "mall.order.cancel"),
    /**
     * 取消订单延迟 Topic（Kafka 改为业务时间戳 + 定时扫描消费方案）
     */
    QUEUE_TTL_ORDER_CANCEL("mall.order.cancel.ttl", "mall.order.cancel.ttl", "mall.order.cancel.ttl");

    /**
     * 兼容字段：原 RabbitMQ 交换机名称，Kafka 不使用
     */
    private String exchange;
    /**
     * Kafka Topic 名称
     */
    private String name;
    /**
     * 兼容字段：原 RabbitMQ 路由键，Kafka 不使用
     */
    private String routeKey;

    QueueEnum(String exchange, String name, String routeKey) {
        this.exchange = exchange;
        this.name = name;
        this.routeKey = routeKey;
    }
}
