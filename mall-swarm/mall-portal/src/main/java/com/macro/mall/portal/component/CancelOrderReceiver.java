package com.macro.mall.portal.component;

import com.macro.mall.portal.config.KafkaTopicConstants;
import com.macro.mall.portal.service.OmsPortalOrderService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * 取消订单消息的处理者（Kafka 实现）
 * <p>
 * 由于 Kafka 不原生支持延迟消息，采用"业务到期时间 + 定时扫描消费"方案：
 * 消费者拉取消息后判断是否到期，未到期则跳过，等待下次扫描。
 * 同时由 OrderTimeOutCancelTask 定时扫描作为兜底，避免消息丢失。
 *
 * @auther macrozheng
 * @github https://github.com/macrozheng
 */
@Component
public class CancelOrderReceiver {
    private static final Logger LOGGER = LoggerFactory.getLogger(CancelOrderReceiver.class);

    @Autowired
    private OmsPortalOrderService portalOrderService;

    @KafkaListener(
            topics = KafkaTopicConstants.ORDER_CANCEL_TOPIC,
            groupId = KafkaTopicConstants.ORDER_CANCEL_CONSUMER_GROUP,
            containerFactory = "kafkaListenerContainerFactory")
    public void handle(ConsumerRecord<String, CancelOrderMessage> record, Acknowledgment ack) {
        CancelOrderMessage message = record.value();
        if (message == null || message.getOrderId() == null) {
            LOGGER.warn("received invalid cancel order message: {}", record);
            ack.acknowledge();
            return;
        }
        Long orderId = message.getOrderId();
        if (!message.isExpired()) {
            // 未到期：暂不提交 offset，等待下次 poll 再次处理（配合 max.poll.interval.ms）
            LOGGER.debug("orderId:{} not expired yet, skip", orderId);
            // 不 ack，让消息保留在分区下次被重新拉取
            return;
        }
        try {
            portalOrderService.cancelOrder(orderId);
            LOGGER.info("process orderId:{}", orderId);
            ack.acknowledge();
        } catch (Exception e) {
            LOGGER.error("process orderId:{} failed", orderId, e);
            throw e; // 触发重试机制
        }
    }
}
