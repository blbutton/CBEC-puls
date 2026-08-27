package com.mars.boot4.mallarticlesummary.article.application.query;

import lombok.Data;

@Data
public class ArticleQuery {
    private String keyword;
    private Integer status;
    private Integer pageNum;
    private Integer pageSize;
}
