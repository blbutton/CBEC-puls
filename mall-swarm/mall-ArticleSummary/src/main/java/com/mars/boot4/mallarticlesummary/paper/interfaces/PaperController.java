package com.mars.boot4.mallarticlesummary.paper.interfaces;

import com.macro.mall.common.api.CommonPage;
import com.macro.mall.common.api.CommonResult;
import com.mars.boot4.mallarticlesummary.paper.application.PaperApplicationService;
import com.mars.boot4.mallarticlesummary.paper.application.command.CreatePaperCommand;
import com.mars.boot4.mallarticlesummary.paper.application.command.UpdatePaperCommand;
import com.mars.boot4.mallarticlesummary.paper.application.dto.PaperDto;
import com.mars.boot4.mallarticlesummary.paper.application.query.PaperQuery;
import com.mars.boot4.mallarticlesummary.paper.domain.model.Paper;
import com.mars.boot4.mallarticlesummary.paper.interfaces.request.CreatePaperRequest;
import com.mars.boot4.mallarticlesummary.paper.interfaces.request.UpdatePaperRequest;
import com.mars.boot4.mallarticlesummary.shared.web.PageAssembler;
import com.mars.boot4.mallarticlesummary.shared.web.ResponseAssembler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 论文管理 Controller
 */
@RestController
@Tag(name = "PaperController", description = "论文管理")
@RequestMapping("/paper")
public class PaperController {

    private final PaperApplicationService paperService;
    private final PaperWebAssembler assembler;

    @Autowired
    public PaperController(PaperApplicationService paperService, PaperWebAssembler assembler) {
        this.paperService = paperService;
        this.assembler = assembler;
    }

    @Operation(summary = "创建论文")
    @PostMapping("/create")
    public CommonResult<Integer> create(@Valid @RequestBody CreatePaperRequest request) {
        CreatePaperCommand command = assembler.toCreateCommand(request);
        return ResponseAssembler.okCount(paperService.create(command));
    }

    @Operation(summary = "修改论文")
    @PostMapping("/update/{id}")
    public CommonResult<Integer> update(@PathVariable Long id, @Valid @RequestBody UpdatePaperRequest request) {
        UpdatePaperCommand command = assembler.toUpdateCommand(request);
        return ResponseAssembler.okCount(paperService.update(id, command));
    }

    @Operation(summary = "删除论文")
    @GetMapping("/delete/{id}")
    public CommonResult<Integer> delete(@PathVariable Long id) {
        return ResponseAssembler.okCount(paperService.delete(id));
    }

    @Operation(summary = "批量删除论文")
    @PostMapping("/delete/batch")
    public CommonResult<Integer> deleteBatch(@RequestParam("ids") List<Long> ids) {
        return ResponseAssembler.okCount(paperService.delete(ids));
    }

    @Operation(summary = "分页查询论文列表")
    @GetMapping("/list")
    public CommonResult<CommonPage<PaperDto>> list(@RequestParam(required = false) String keyword,
                                                   @RequestParam(required = false) Integer status,
                                                   @RequestParam(defaultValue = "1") Integer pageNum,
                                                   @RequestParam(defaultValue = "5") Integer pageSize) {
        PaperQuery query = new PaperQuery();
        query.setKeyword(keyword);
        query.setStatus(status);
        query.setPageNum(pageNum);
        query.setPageSize(pageSize);
        List<Paper> list = paperService.list(query);
        return PageAssembler.page(list, assembler::toDto);
    }

    @Operation(summary = "根据ID查询")
    @GetMapping("/{id}")
    public CommonResult<PaperDto> getItem(@PathVariable Long id) {
        return ResponseAssembler.ok(assembler.toDto(paperService.get(id)));
    }

    @Operation(summary = "批量修改状态")
    @PostMapping("/update/status")
    public CommonResult<Integer> updateStatus(@RequestParam("ids") List<Long> ids, @RequestParam("status") Integer status) {
        return ResponseAssembler.okCount(paperService.updateStatus(ids, status));
    }
}
