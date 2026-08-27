package com.mars.boot4.mallarticlesummary.paper.application.command;

import lombok.Data;

import java.util.Date;

@Data
public class UpdatePaperCommand {
    private String title;
    private String abstractText;
    private String content;
    private String authors;
    private String keywords;
    private String journal;
    private String doi;
    private String pdfUrl;
    private Integer publishYear;
    private String category;
    private Integer sort;
    private Integer status;
    private Date publishTime;
}
