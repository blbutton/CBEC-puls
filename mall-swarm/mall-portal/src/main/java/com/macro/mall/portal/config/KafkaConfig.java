package com.macro.mall.portal.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.CooperativeStickyAssignor;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.util.backoff.FixedBackOff;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka 配置（KRaft 模式，无 Zookeeper）
 * <p>
 * 替代原 RabbitMQ，承担"超时取消订单"延迟消息能力。
 * Kafka 不原生支持延迟消息，采用"业务时间戳 + 定时扫描消费"方案：
 * 生产者按超时时间所在档位写入指定分区，消费者仅在消息到期时处理。
 *
 * @auther macrozheng
 * @github https://github.com/macrozheng
 */
@Configuration
@EnableKafka
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    /**
     * 取消订单 Topic（3 分区，副本数可按集群规模调整）
     */
    @Bean
    public NewTopic orderCancelTopic() {
        return TopicBuilder.name(KafkaTopicConstants.ORDER_CANCEL_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }

    /**
     * Producer 工厂
     */
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "1");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        return new DefaultKafkaProducerFactory<>(props);
    }

    /**
     * KafkaTemplate
     */
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> pf) {
        return new KafkaTemplate<>(pf);
    }

    /**
     * Consumer 工厂
     * <p>
     * 使用协作式粘性分区分配器（CooperativeStickyAssignor），避免重平衡时全量撤销分区，
     * 减少 SyncGroup 阶段的竞争压力。
     */
    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);
        // 协作式粘性分区分配，减少重平衡开销
        props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
                CooperativeStickyAssignor.class.getName());
        // 增加会话超时，减少频繁重平衡
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 45000);
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 15000);
        // 重平衡与重连退避
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 600000);
        props.put(ConsumerConfig.RECONNECT_BACKOFF_MS_CONFIG, 3000);
        props.put(ConsumerConfig.RETRY_BACKOFF_MS_CONFIG, 3000);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.macro.mall.portal.component,java.lang");
        return new DefaultKafkaConsumerFactory<>(props);
    }

    /**
     * Kafka 错误处理器
     * <p>
     * 处理消息消费异常（重试 3 次，间隔 5 秒）；
     * 对于无记录的基础设施异常（如 SyncGroup UNKNOWN_SERVER_ERROR），
     * 只记一次 warn 然后静默，避免 KRaft Broker 异常时无限刷屏。
     */
    @Bean
    public DefaultErrorHandler kafkaErrorHandler() {
        DefaultErrorHandler handler = new DefaultErrorHandler(new FixedBackOff(5000L, 3L)) {
            private final Logger LOG = LoggerFactory.getLogger("KafkaErrorHandler");
            private volatile long lastLoggedAt = 0L;

            @Override
            public void handleOtherException(Exception thrownException,
                                            org.apache.kafka.clients.consumer.Consumer<?, ?> consumer,
                                            org.springframework.kafka.listener.MessageListenerContainer container,
                                            boolean batchListener) {
                // 无记录信息的基础设施异常（如 SyncGroup UNKNOWN_SERVER_ERROR）：
                // 只以 warn 级别限流记录（每 60s 最多一次），不抛异常；
                // 订单取消由 OrderTimeOutCancelTask 定时扫描兜底。
                long now = System.currentTimeMillis();
                if (now - lastLoggedAt > 60_000L) {
                    LOG.warn("Kafka consumer infra exception, skipped (throttled): {}",
                            thrownException.getMessage());
                    lastLoggedAt = now;
                }
            }
        };
        return handler;
    }

    /**
     * Kafka 监听容器工厂（@KafkaListener 使用）
     * <p>
     * autoStartup 默认关闭：KRaft Broker 在处理消费者组 SyncGroup 时持续返回
     * UNKNOWN_SERVER_ERROR（Broker 端 bug），导致 Listener 线程无限 JoinGroup/SyncGroup
     * 循环，占用 CPU 与刷日志。订单取消由 {@link com.macro.mall.portal.component.OrderTimeOutCancelTask}
     * 定时扫描兜底，Kafka Listener 待 Broker 端修复后再启用（可通过
     * spring.kafka.consumer.auto-startup=true 显式开启）。
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> cf, DefaultErrorHandler errorHandler,
            @Value("${spring.kafka.consumer.auto-startup:false}") boolean autoStartup) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(cf);
        factory.setConcurrency(1);
        factory.setAutoStartup(autoStartup);
        factory.getContainerProperties().setPollTimeout(3000);
        factory.setCommonErrorHandler(errorHandler);
        // 手动提交 offset
        factory.getContainerProperties().setAckMode(
                org.springframework.kafka.listener.ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        return factory;
    }
}
