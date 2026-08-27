package com.macro.mall.portal.component;

import com.macro.mall.portal.config.KafkaTopicConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;

/**
 * 取消订单消息的发出者（Kafka 实现）
 * <p>
 * Kafka 不原生支持延迟消息，采用"业务到期时间 + 定时扫描消费"方案：
 * 发送时计算 expireTime = now + delayTimes，消费者按到期时间过滤。
 *
 * @auther macrozheng
 * @github https://github.com/macrozheng
 */
@Component
public class CancelOrderSender {
    private static final Logger LOGGER = LoggerFactory.getLogger(CancelOrderSender.class);

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * 发送取消订单延迟消息
     *
     * @param orderId    订单ID
     * @param delayTimes 延迟毫秒数
     */
    public void sendMessage(Long orderId, final long delayTimes) {
        long expireTime = Instant.now().toEpochMilli() + delayTimes;
        CancelOrderMessage payload = new CancelOrderMessage(orderId, expireTime);
        String key = String.valueOf(orderId);
        CompletableFuture<SendResult<String, Object>> future =
                kafkaTemplate.send(KafkaTopicConstants.ORDER_CANCEL_TOPIC, key, payload);
        future.whenComplete((result, ex) -> {
            if (ex != null) {
                LOGGER.error("send cancel order message failed, orderId:{}", orderId, ex);
            } else {
                LOGGER.info("send orderId:{}, expireTime:{}", orderId, expireTime);
            }
        });
    }
}
