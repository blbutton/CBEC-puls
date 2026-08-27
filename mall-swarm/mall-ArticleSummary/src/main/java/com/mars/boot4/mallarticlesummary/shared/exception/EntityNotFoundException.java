package com.mars.boot4.mallarticlesummary.shared.exception;

/**
 * 实体未找到异常
 */
public class EntityNotFoundException extends BusinessException {

    public EntityNotFoundException(String entity, Long id) {
        super(ErrorCode.ENTITY_NOT_FOUND, entity + " 不存在: " + id);
    }
}
