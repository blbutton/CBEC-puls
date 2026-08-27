package com.macro.mall.portal.component;

import com.macro.mall.model.OmsOrder;
import com.macro.mall.model.OmsOrderExample;
import com.macro.mall.model.OmsOrderSetting;
import com.macro.mall.mapper.OmsOrderMapper;
import com.macro.mall.mapper.OmsOrderSettingMapper;
import com.macro.mall.portal.service.OmsPortalOrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;

/**
 * 订单超时取消定时兜底任务
 * <p>
 * Kafka 不原生支持延迟消息，使用"业务到期时间 + 定时扫描消费"方案时，
 * 若消费者侧消息丢失或处理失败，将导致超时订单无法取消。
 * 本任务每 10 分钟扫描一次"已下单未支付且超过超时时间"的订单，
 * 调用取消订单逻辑，作为消息队列的兜底。
 *
 * @auther macrozheng
 * @github https://github.com/macrozheng
 */
@Component
public class OrderTimeOutCancelTask {
    private static final Logger LOGGER = LoggerFactory.getLogger(OrderTimeOutCancelTask.class);

    @Autowired
    private OmsOrderMapper orderMapper;
    @Autowired
    private OmsOrderSettingMapper orderSettingMapper;
    @Autowired
    private OmsPortalOrderService portalOrderService;

    /**
     * 每 10 分钟扫描一次超时未支付订单
     */
    @Scheduled(fixedDelay = 10 * 60 * 1000, initialDelay = 60 * 1000)
    public void scanTimeoutOrders() {
        OmsOrderSetting setting = orderSettingMapper.selectByPrimaryKey(1L);
        if (setting == null) {
            return;
        }
        long normalOvertimeMs = setting.getNormalOrderOvertime() * 60 * 1000L;
        Date deadline = new Date(System.currentTimeMillis() - normalOvertimeMs);

        OmsOrderExample example = new OmsOrderExample();
        example.createCriteria()
                .andStatusEqualTo(0)               // 0: 待支付
                .andCreateTimeLessThan(deadline);  // 下单时间早于超时线
        List<OmsOrder> timeoutOrders = orderMapper.selectByExample(example);
        if (timeoutOrders == null || timeoutOrders.isEmpty()) {
            return;
        }
        LOGGER.info("scanTimeoutOrders found {} timeout orders", timeoutOrders.size());
        for (OmsOrder order : timeoutOrders) {
            try {
                portalOrderService.cancelOrder(order.getId());
                LOGGER.info("scanTimeoutOrders cancel orderId:{}", order.getId());
            } catch (Exception e) {
                LOGGER.error("scanTimeoutOrders cancel orderId:{} failed", order.getId(), e);
            }
        }
    }
}
