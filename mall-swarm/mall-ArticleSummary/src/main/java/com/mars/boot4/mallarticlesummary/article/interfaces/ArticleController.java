package com.mars.boot4.mallarticlesummary.article.interfaces;

import com.macro.mall.common.api.CommonPage;
import com.macro.mall.common.api.CommonResult;
import com.mars.boot4.mallarticlesummary.article.application.ArticleApplicationService;
import com.mars.boot4.mallarticlesummary.article.application.command.CreateArticleCommand;
import com.mars.boot4.mallarticlesummary.article.application.command.UpdateArticleCommand;
import com.mars.boot4.mallarticlesummary.article.application.dto.ArticleDto;
import com.mars.boot4.mallarticlesummary.article.application.query.ArticleQuery;
import com.mars.boot4.mallarticlesummary.article.domain.model.Article;
import com.mars.boot4.mallarticlesummary.article.interfaces.request.CreateArticleRequest;
import com.mars.boot4.mallarticlesummary.article.interfaces.request.UpdateArticleRequest;
import com.mars.boot4.mallarticlesummary.shared.web.PageAssembler;
import com.mars.boot4.mallarticlesummary.shared.web.ResponseAssembler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 文章管理 Controller
 */
@RestController
@Tag(name = "ArticleController", description = "文章管理")
@RequestMapping("/article")
public class ArticleController {

    private final ArticleApplicationService articleService;
    private final ArticleWebAssembler assembler;

    @Autowired
    public ArticleController(ArticleApplicationService articleService, ArticleWebAssembler assembler) {
        this.articleService = articleService;
        this.assembler = assembler;
    }

    @Operation(summary = "创建文章")
    @PostMapping("/create")
    public CommonResult<Integer> create(@Valid @RequestBody CreateArticleRequest request) {
        CreateArticleCommand command = assembler.toCreateCommand(request);
        return ResponseAssembler.okCount(articleService.create(command));
    }

    @Operation(summary = "修改文章")
    @PostMapping("/update/{id}")
    public CommonResult<Integer> update(@PathVariable Long id, @Valid @RequestBody UpdateArticleRequest request) {
        UpdateArticleCommand command = assembler.toUpdateCommand(request);
        return ResponseAssembler.okCount(articleService.update(id, command));
    }

    @Operation(summary = "删除指定文章")
    @GetMapping("/delete/{id}")
    public CommonResult<Integer> delete(@PathVariable Long id) {
        return ResponseAssembler.okCount(articleService.delete(id));
    }

    @Operation(summary = "批量删除文章")
    @PostMapping("/delete/batch")
    public CommonResult<Integer> deleteBatch(@RequestParam("ids") List<Long> ids) {
        return ResponseAssembler.okCount(articleService.delete(ids));
    }

    @Operation(summary = "分页查询文章列表")
    @GetMapping("/list")
    public CommonResult<CommonPage<ArticleDto>> list(@RequestParam(required = false) String keyword,
                                                     @RequestParam(required = false) Integer status,
                                                     @RequestParam(defaultValue = "1") Integer pageNum,
                                                     @RequestParam(defaultValue = "5") Integer pageSize) {
        ArticleQuery query = new ArticleQuery();
        query.setKeyword(keyword);
        query.setStatus(status);
        query.setPageNum(pageNum);
        query.setPageSize(pageSize);
        List<Article> list = articleService.list(query);
        return PageAssembler.page(list, assembler::toDto);
    }

    @Operation(summary = "根据ID查询")
    @GetMapping("/{id}")
    public CommonResult<ArticleDto> getItem(@PathVariable Long id) {
        return ResponseAssembler.ok(assembler.toDto(articleService.get(id)));
    }

    @Operation(summary = "批量修改状态")
    @PostMapping("/update/status")
    public CommonResult<Integer> updateStatus(@RequestParam("ids") List<Long> ids, @RequestParam("status") Integer status) {
        return ResponseAssembler.okCount(articleService.updateStatus(ids, status));
    }
}
