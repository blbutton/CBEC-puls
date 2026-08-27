package com.mars.boot4.mallarticlesummary.news.interfaces.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Date;

@Data
public class CreateNewsRequest {
    @NotEmpty @Schema(title = "标题", required = true) private String title;
    @Schema(title = "摘要") private String summary;
    @Schema(title = "正文") private String content;
    @Schema(title = "封面图") private String coverImage;
    @Schema(title = "来源") private String source;
    @Schema(title = "作者") private String author;
    @Schema(title = "分类") private String category;
    @Schema(title = "排序") private Integer sort;
    @Schema(title = "状态:0未发布,1已发布,2下架") private Integer status;
    @Schema(title = "是否置顶:0否,1是") private Integer isTop;
    @Schema(title = "发布时间") private Date publishTime;
}
