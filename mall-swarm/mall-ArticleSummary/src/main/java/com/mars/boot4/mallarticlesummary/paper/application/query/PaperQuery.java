package com.mars.boot4.mallarticlesummary.paper.application.query;

import lombok.Data;

@Data
public class PaperQuery {
    private String keyword;
    private Integer status;
    private Integer pageNum;
    private Integer pageSize;
}
