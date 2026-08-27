package com.macro.mall.portal.config;

/**
 * Kafka Topic 常量定义
 *
 * @auther macrozheng
 * @github https://github.com/macrozheng
 */
public final class KafkaTopicConstants {

    private KafkaTopicConstants() {
    }

    /**
     * 取消订单 Topic
     */
    public static final String ORDER_CANCEL_TOPIC = "mall.order.cancel.topic";

    /**
     * 取消订单消费者分组
     */
    public static final String ORDER_CANCEL_CONSUMER_GROUP = "mall-portal-order-cancel-group";
}
