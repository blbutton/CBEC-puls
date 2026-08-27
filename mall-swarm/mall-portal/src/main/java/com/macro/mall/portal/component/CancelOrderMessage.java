package com.macro.mall.portal.component;

import lombok.Data;

import java.io.Serializable;
import java.time.Instant;

/**
 * 取消订单延迟消息载荷
 * <p>
 * Kafka 不原生支持延迟消息，使用"业务到期时间 + 定时扫描消费"方案：
 * 消息发送时写入 expireTime，消费者仅在当前时间 ≥ expireTime 时处理，
 * 否则跳过等待下次扫描。
 *
 * @auther macrozheng
 * @github https://github.com/macrozheng
 */
@Data
public class CancelOrderMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 订单ID
     */
    private Long orderId;
    /**
     * 消息到期处理时间（毫秒）
     */
    private Long expireTime;

    public CancelOrderMessage() {
    }

    public CancelOrderMessage(Long orderId, Long expireTime) {
        this.orderId = orderId;
        this.expireTime = expireTime;
    }

    /**
     * 是否已到期
     */
    public boolean isExpired() {
        return Instant.now().toEpochMilli() >= expireTime;
    }
}
