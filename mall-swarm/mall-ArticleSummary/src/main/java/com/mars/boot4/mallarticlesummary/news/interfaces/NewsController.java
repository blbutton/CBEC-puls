package com.mars.boot4.mallarticlesummary.news.interfaces;

import com.macro.mall.common.api.CommonPage;
import com.macro.mall.common.api.CommonResult;
import com.mars.boot4.mallarticlesummary.news.application.NewsApplicationService;
import com.mars.boot4.mallarticlesummary.news.application.command.CreateNewsCommand;
import com.mars.boot4.mallarticlesummary.news.application.command.UpdateNewsCommand;
import com.mars.boot4.mallarticlesummary.news.application.dto.NewsDto;
import com.mars.boot4.mallarticlesummary.news.application.query.NewsQuery;
import com.mars.boot4.mallarticlesummary.news.domain.model.News;
import com.mars.boot4.mallarticlesummary.news.interfaces.request.CreateNewsRequest;
import com.mars.boot4.mallarticlesummary.news.interfaces.request.UpdateNewsRequest;
import com.mars.boot4.mallarticlesummary.shared.web.PageAssembler;
import com.mars.boot4.mallarticlesummary.shared.web.ResponseAssembler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 新闻管理 Controller
 */
@RestController
@Tag(name = "NewsController", description = "新闻管理")
@RequestMapping("/news")
public class NewsController {

    private final NewsApplicationService newsService;
    private final NewsWebAssembler assembler;

    @Autowired
    public NewsController(NewsApplicationService newsService, NewsWebAssembler assembler) {
        this.newsService = newsService;
        this.assembler = assembler;
    }

    @Operation(summary = "创建新闻")
    @PostMapping("/create")
    public CommonResult<Integer> create(@Valid @RequestBody CreateNewsRequest request) {
        CreateNewsCommand command = assembler.toCreateCommand(request);
        return ResponseAssembler.okCount(newsService.create(command));
    }

    @Operation(summary = "修改新闻")
    @PostMapping("/update/{id}")
    public CommonResult<Integer> update(@PathVariable Long id, @Valid @RequestBody UpdateNewsRequest request) {
        UpdateNewsCommand command = assembler.toUpdateCommand(request);
        return ResponseAssembler.okCount(newsService.update(id, command));
    }

    @Operation(summary = "删除新闻")
    @GetMapping("/delete/{id}")
    public CommonResult<Integer> delete(@PathVariable Long id) {
        return ResponseAssembler.okCount(newsService.delete(id));
    }

    @Operation(summary = "批量删除新闻")
    @PostMapping("/delete/batch")
    public CommonResult<Integer> deleteBatch(@RequestParam("ids") List<Long> ids) {
        return ResponseAssembler.okCount(newsService.delete(ids));
    }

    @Operation(summary = "分页查询新闻列表")
    @GetMapping("/list")
    public CommonResult<CommonPage<NewsDto>> list(@RequestParam(required = false) String keyword,
                                                 @RequestParam(required = false) Integer status,
                                                 @RequestParam(defaultValue = "1") Integer pageNum,
                                                 @RequestParam(defaultValue = "5") Integer pageSize) {
        NewsQuery query = new NewsQuery();
        query.setKeyword(keyword);
        query.setStatus(status);
        query.setPageNum(pageNum);
        query.setPageSize(pageSize);
        List<News> list = newsService.list(query);
        return PageAssembler.page(list, assembler::toDto);
    }

    @Operation(summary = "根据ID查询")
    @GetMapping("/{id}")
    public CommonResult<NewsDto> getItem(@PathVariable Long id) {
        return ResponseAssembler.ok(assembler.toDto(newsService.get(id)));
    }

    @Operation(summary = "批量修改状态")
    @PostMapping("/update/status")
    public CommonResult<Integer> updateStatus(@RequestParam("ids") List<Long> ids, @RequestParam("status") Integer status) {
        return ResponseAssembler.okCount(newsService.updateStatus(ids, status));
    }
}
