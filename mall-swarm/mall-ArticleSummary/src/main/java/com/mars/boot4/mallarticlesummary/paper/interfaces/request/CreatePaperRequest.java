package com.mars.boot4.mallarticlesummary.paper.interfaces.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Date;

@Data
public class CreatePaperRequest {
    @NotEmpty @Schema(title = "标题", required = true) private String title;
    @Schema(title = "摘要") private String abstractText;
    @Schema(title = "正文") private String content;
    @Schema(title = "作者列表") private String authors;
    @Schema(title = "关键词") private String keywords;
    @Schema(title = "期刊/会议") private String journal;
    @Schema(title = "DOI") private String doi;
    @Schema(title = "PDF链接") private String pdfUrl;
    @Schema(title = "发表年份") private Integer publishYear;
    @Schema(title = "学科分类") private String category;
    @Schema(title = "排序") private Integer sort;
    @Schema(title = "状态:0未发布,1已发布,2下架") private Integer status;
    @Schema(title = "发布时间") private Date publishTime;
}
