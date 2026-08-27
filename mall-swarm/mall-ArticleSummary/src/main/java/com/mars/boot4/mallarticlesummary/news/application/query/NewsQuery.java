package com.mars.boot4.mallarticlesummary.news.application.query;

import lombok.Data;

@Data
public class NewsQuery {
    private String keyword;
    private Integer status;
    private Integer pageNum;
    private Integer pageSize;
}
