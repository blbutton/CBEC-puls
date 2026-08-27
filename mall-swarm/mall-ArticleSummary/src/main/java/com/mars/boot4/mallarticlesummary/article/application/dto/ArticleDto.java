package com.mars.boot4.mallarticlesummary.article.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.Date;

@Data
public class ArticleDto {
    @Schema(title = "主键ID") private Long id;
    @Schema(title = "标题") private String title;
    @Schema(title = "摘要") private String summary;
    @Schema(title = "正文") private String content;
    @Schema(title = "封面图URL") private String coverImage;
    @Schema(title = "作者") private String author;
    @Schema(title = "分类") private String category;
    @Schema(title = "标签(逗号分隔)") private String tags;
    @Schema(title = "浏览量") private Integer viewCount;
    @Schema(title = "点赞数") private Integer likeCount;
    @Schema(title = "排序") private Integer sort;
    @Schema(title = "状态:0未发布,1已发布,2下架") private Integer status;
    @Schema(title = "是否置顶:0否,1是") private Integer isTop;
    @Schema(title = "发布时间") private Date publishTime;
    @Schema(title = "创建时间") private Date createTime;
    @Schema(title = "更新时间") private Date updateTime;
}
