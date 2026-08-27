package com.mars.boot4.mallarticlesummary.article.application.command;

import lombok.Data;

import java.util.Date;

@Data
public class CreateArticleCommand {
    private String title;
    private String summary;
    private String content;
    private String coverImage;
    private String author;
    private String category;
    private String tags;
    private Integer sort;
    private Integer status;
    private Integer isTop;
    private Date publishTime;
}
