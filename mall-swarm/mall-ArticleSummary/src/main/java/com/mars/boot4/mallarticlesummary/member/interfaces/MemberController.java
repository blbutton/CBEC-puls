package com.mars.boot4.mallarticlesummary.member.interfaces;

import com.macro.mall.common.api.CommonPage;
import com.macro.mall.common.api.CommonResult;
import com.mars.boot4.mallarticlesummary.member.application.MemberApplicationService;
import com.mars.boot4.mallarticlesummary.member.application.command.CreateMemberCommand;
import com.mars.boot4.mallarticlesummary.member.application.command.UpdateMemberCommand;
import com.mars.boot4.mallarticlesummary.member.application.dto.MemberDto;
import com.mars.boot4.mallarticlesummary.member.application.query.MemberQuery;
import com.mars.boot4.mallarticlesummary.member.domain.model.Member;
import com.mars.boot4.mallarticlesummary.member.interfaces.request.CreateMemberRequest;
import com.mars.boot4.mallarticlesummary.member.interfaces.request.UpdateMemberRequest;
import com.mars.boot4.mallarticlesummary.shared.web.PageAssembler;
import com.mars.boot4.mallarticlesummary.shared.web.ResponseAssembler;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 会员管理 Controller
 */
@RestController
@Tag(name = "MemberController", description = "会员管理")
@RequestMapping("/member")
public class MemberController {

    private final MemberApplicationService memberService;
    private final MemberWebAssembler assembler;

    @Autowired
    public MemberController(MemberApplicationService memberService, MemberWebAssembler assembler) {
        this.memberService = memberService;
        this.assembler = assembler;
    }

    @Operation(summary = "创建会员")
    @PostMapping("/create")
    public CommonResult<Integer> create(@Valid @RequestBody CreateMemberRequest request) {
        CreateMemberCommand command = assembler.toCreateCommand(request);
        return ResponseAssembler.okCount(memberService.create(command));
    }

    @Operation(summary = "修改会员")
    @PostMapping("/update/{id}")
    public CommonResult<Integer> update(@PathVariable Long id, @Valid @RequestBody UpdateMemberRequest request) {
        UpdateMemberCommand command = assembler.toUpdateCommand(request);
        return ResponseAssembler.okCount(memberService.update(id, command));
    }

    @Operation(summary = "删除指定会员")
    @GetMapping("/delete/{id}")
    public CommonResult<Integer> delete(@PathVariable Long id) {
        return ResponseAssembler.okCount(memberService.delete(id));
    }

    @Operation(summary = "批量删除会员")
    @PostMapping("/delete/batch")
    public CommonResult<Integer> deleteBatch(@RequestParam("ids") List<Long> ids) {
        return ResponseAssembler.okCount(memberService.delete(ids));
    }

    @Operation(summary = "分页查询会员列表")
    @GetMapping("/list")
    public CommonResult<CommonPage<MemberDto>> list(@RequestParam(required = false) String keyword,
                                                     @RequestParam(required = false) Integer status,
                                                     @RequestParam(defaultValue = "1") Integer pageNum,
                                                     @RequestParam(defaultValue = "5") Integer pageSize) {
        MemberQuery query = new MemberQuery();
        query.setKeyword(keyword);
        query.setStatus(status);
        query.setPageNum(pageNum);
        query.setPageSize(pageSize);
        List<Member> list = memberService.list(query);
        return PageAssembler.page(list, assembler::toDto);
    }

    @Operation(summary = "根据ID查询")
    @GetMapping("/{id}")
    public CommonResult<MemberDto> getItem(@PathVariable Long id) {
        return ResponseAssembler.ok(assembler.toDto(memberService.get(id)));
    }

    @Operation(summary = "批量修改状态")
    @PostMapping("/update/status")
    public CommonResult<Integer> updateStatus(@RequestParam("ids") List<Long> ids, @RequestParam("status") Integer status) {
        return ResponseAssembler.okCount(memberService.updateStatus(ids, status));
    }
}
