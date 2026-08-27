package com.mars.boot4.mallarticlesummary.news.application.command;

import lombok.Data;

import java.util.Date;

@Data
public class UpdateNewsCommand {
    private String title;
    private String summary;
    private String content;
    private String coverImage;
    private String source;
    private String author;
    private String category;
    private Integer sort;
    private Integer status;
    private Integer isTop;
    private Date publishTime;
}
