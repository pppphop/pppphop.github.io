---
title: "P3课下-logisim单周期CPU"
date: "2025-10-28 19:41:44"
updated: "2026-01-21 17:55:02"
categories:
  - "CO课下"
tags:
  - "CO"
  - "CO课下"
permalink: "posts/P3课下-logisim单周期CPU/"
---
# CO设计文档—Logisim单周期CPU

## CPU设计方案综述

### 总体设计概述

整体架构图参考：

![](/posts/P3%E8%AF%BE%E4%B8%8B-logisim%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E8%AE%BE%E8%AE%A1%E5%9B%BE.png)

### 设计需求

- 处理器为 32 位单周期处理器，应支持的指令集为：<strong>add, sub, ori, lw, sw, beq, lui, nop</strong>

 ，其中：
  - `nop` 为空指令，机器码 `0x00000000`，不进行任何有效行为（修改寄存器等）。
  - `add, sub` 按无符号加减法处理（不考虑溢出）。
- 需要采用<strong>模块化</strong>和<strong>层次化</strong>设计。顶层有效的驱动信号要求包括且仅包括<strong>异步复位信号 reset</strong>（$clk$ 使用内置时钟模块）。

### 关键模块定义

#### 1.PC（程序计数器）

<strong>端口说明</strong>

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 异步复位信号   PCIn 输入 输入NPC   PCOut 输出 输出当前指令地址

#### 2.NPC（次地址计算单元）

<strong>端口说明</strong>

信号名称 方向 功能描述     PC&#91;31:0&#93; 输入 32位输入当前地址   NPC&#91;31:0&#93; 输出 32位输出次地址   NPCOp&#91;1:0&#93; 输入 控制信号   Ra&#91;31:0&#93; 输入 `$ra`寄存器保存的32位地址   Zero 输入 `$rs`与`$rt`是否相等的标志；1：相等；0：不等   PC+4&#91;31:0&#93; 输出 输出PC+4的值

##### 控制信号说明

控制信号值 功能     `3'b000` `NPC=PC+4`   `3'b001` 执行`beq`指令   `3'b110` 执行`j`，`jal`指令   `3'b111` 执行`jalr`，`jr`指令

![](/posts/P3%E8%AF%BE%E4%B8%8B-logisim%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162405.png)

#### 3.IM（指令储存器）

将PC中储存的对应地址的指令取出。

- I用 ROM 实现，容量为 4096 × 32bit。
- <strong>起始地址：0x00003000。</strong>
- 地址范围：0x00003000 &#126; 0x00006FFF。
- ROM 内部的起始地址是从 0 开始的，即 ROM 的 0 位置存储的是 PC 为 0x00003000 的指令，每条指令是一个 32bit 常数。
- 经过以上分析，不难发现 ROM 实际地址宽度仅需 12 位，但是<strong>传入的PC地址</strong>是<strong>32位</strong>的，那么我们应该取`PC[13:2]`接入ROM的输入端

![](/posts/P3%E8%AF%BE%E4%B8%8B-logisim%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162645.png)

#### 4.GRF（寄存器堆）

<strong>端口说明</strong>

信号名称 方向 功能描述     A1&#91;4:0&#93; 输入 5位地址输入信号，将其储存的数据读出到RD1   A2&#91;4:0&#93; 输入 5位地址输入信号，将其储存的数据读出到RD2   A3&#91;4:0&#93; 输入 5位地址输入信号，将其作为写入数据的目标寄存器   RD1&#91;31:0&#93; 输出 输出A1指定的寄存器中的32位数据   RD2&#91;31:0&#93; 输出 输出A2指定的寄存器中的32位数据   WD&#91;31:0&#93; 输入 32位数据输入信号   WE 输入 写使能信号；1：写入有效；0：写入无效   clk 输入 时钟信号   reset 输入 异步复位信号，将32个寄存器中的数据清零；1：复位；0：无效

##### 控制信号说明

<strong>1. WRA3Sel</strong>

控制信号值 功能     `2'b00` 选择待写入寄存器地址来自`Instr[20:16]`   `2'b01` 选择待写入寄存器地址来自`Instr[15:11]`   `2'b10` 选择写入寄存器的地址为31(`$ra`)

<strong>2. WDSel</strong>

控制信号值 功能     `2'b00` 选择写入寄存器的数据来自ALU   `2'b01` 选择写入寄存器的数据来自DM运算结果   `2'b10` 选择写入寄存器的数据为PC+4

#### 5.EXT（位扩展）

将16位二进制数进行零扩展或符号扩展到32位

<strong>控制信号说明</strong>

控制信号值 功能     `1'b0` 零扩展   `1'b1` 符号扩展

![](/posts/P3%E8%AF%BE%E4%B8%8B-logisim%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162755.png)

#### 6.ALU（算术逻辑单元）

<strong>端口说明</strong>

信号名称 方向 功能描述     A&#91;31:0&#93; 输入 32位输入运算数A   B&#91;31:0&#93; 输入 32位输入运算数B   C&#91;31:0&#93; 输出 32位输出运算结果   ALUOp&#91;3:0&#93; 输入 控制信号   Zero 输出 若$A-B=0$则置为1，否则置为0   LessZero 输出 若$A&#60;B$则置为1，否则置为0

<strong>控制信号说明</strong>

<strong>1. ALUOp</strong>

控制信号值 功能     `3'b000` 执行加法运算   `3'b001` 执行减法运算   `3'b010` 执行逻辑或运算   `3'b011` 执行`sll`运算   `3'b100` 执行`lui`指令

<strong>2. ALUBSel</strong>

控制信号值 功能     `1'b0` 选择寄存器中的值进行运算   `1'b1` 选择立即数进行运算

<strong>3. ALUASel</strong>

控制信号值 功能     `1'b0` 选择寄存器中的值进行运算   `1'b1` 选择`sll`指令中移位的位数

![](/posts/P3%E8%AF%BE%E4%B8%8B-logisim%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162833.png)

#### 7.DM（数据储存器）

<strong>端口说明</strong>

信号名称 方向 功能描述     Addr&#91;31:0&#93; 输入 待操作的内存地址   WD&#91;31:0&#93; 输入 待写入内存的值   clk 输入 时钟信号   reset 输入 异步复位信号   DMWr 输入 写使能信号；1：写入有效；0：写入无效   DMOp 输入 控制信号   RD&#91;31:0&#93; 输出 输入地址指向的内存中储存的值

<strong>控制信号说明</strong>

控制信号值 功能     `2'b00` 对应`lw`和`sw`指令，写入或读取整个字   `2'b01` （保留）对应`lh`和`sh`指令，写入或读取半字   `2'b10` （保留）对应`lb`和`sb`指令，写入或读取整个字

也许对于`lbu`指令还需要添加额外的控制信号

![](/posts/P3%E8%AF%BE%E4%B8%8B-logisim%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20163108.png)

### 8.Control-控制模块

指令 opcode funct NPCOp WRA3Sel WDSel EXTOp WE ALUASel ALUBSel ALUOp DMWr DMOp     <strong>add</strong> 000000 100000 000 1 0 X 1 0 0 000 0 X   <strong>sub</strong> 000000 100010 000 1 0 X 1 0 0 001 0 X   <strong>ori</strong> 001101  000 0 0 0 1 0 1 011 0 X   <strong>lw</strong> 100011  000 0 1 1 1 0 1 000 0 00   <strong>sw</strong> 101011  000 0 1 1 0 0 1 000 1 00   <strong>beq</strong> 000100  001 X X 1 0 0 0 001 0 X   <strong>lui</strong> 001111  000 0 0 X 1 0 1 100 0 X

### 9.Top-数据通路

取址 访存 计算 存储 写回     $add$ $PC+4$ $读出rs$,$rt字段对应的寄存器的值到RD1,RD2$ $RD1 +RD2 \newline =ALUans=DMaddr$ $DMwr=0$ $A3=rd\newline WD=ALUans$   $sub$ $PC+4$ $读出rs,rt字段对应的寄存器的值到RD1,RD2$ $RD1 - RD2\newline =ALUans=DMaddr$ $DMwr=0$ $A3=rd\newline WD=ALUans$   $ori$ $PC+4$ $读出rs字段对应的寄存器的值到RD1, \ 立即数零扩展$ $RD1 &#126; &#126; (zero)imm32\newline =ALUans=DMaddr$ $DMwr=0$ $A3=rt\newline WD=ALUans$   $lw$ $PC+4$ $读出rs字段对应的寄存器的值到RD1, \ 立即数符号扩展$ $RD1+(signed)imm32 \newline =ALUans=DMaddr$ $DMwr=0$ $A3=rt\newline WD=DMrd$   $sw$ $PC+4$ $读出rs,rt字段对应的寄存器的值到RD1,RD2 \ 立即数符号扩展$ $RD1+(signed)imm32 \newline =ALUans=DMaddr$ $DMWD=RD2\newline (=grf&#91;rt&#93;)$ $GRFwe=0$   $beq$ $zero=1时: \newline PC+4+(sign)imm32\newline zero=0时:PC+4$ $读出rs,rt字段对应的寄存器的值到RD1,RD2 \ 立即数符号扩展$ $zero=\newline (RD1-RD2==0)$ $DMwr=0$ $GRFwe=0$   $lui$ $PC+4$ $立即数零扩展$ $imm32&#60;&#60;16 \newline =ALUans=DMaddr$ $DMwr=0$ $A3=rt\newline WD=ALUans$   $nop$ $PC+4$ \ \ $DMwr=0$ $GRFwe=0$

![](/posts/P3%E8%AF%BE%E4%B8%8B-logisim%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20163224.png)

## 测试方案

本人搭了一整天才初步完成评测机（对拍机），后来又维护修修改改了半天，中间遇到了一些问题，最后直到6.0版本才出完全体。其实代码挺史山的，全部挤在一个文件里。

我们发现课下数据是很弱的，但即便如此我也卡了好一会儿。首先是$PC$，需要$+3000$输出；其次是$beq$，我第一遍误对其立即数段进行了零扩展，事实上$beq$可能往前跳可能往后跳，所以显然是要进行符号扩展的。

评测机的构建思路大致是这样：

> 1. 初始化模块配置环境参数和路径
> 2. 用python/C++自己写生成mips代码的，毕竟格式都是固定的，比如add $1,$2,$3这种，把指令字符串放两个集合分别存R型和I型，分别按指令格式用随机数抽取每个字段循环生成拼接在一起，输出到一个asm文件里；
> 3. 写一个命令行的字符串，程序运行时自动调用MARS进行汇编
> 4. 是注入，用正则表达式匹配ROM，然后命令行写入ROM当中
> 5. 使用命令行运行Logisim电路并捕获输出
> 6. 等15s跑完后对比结果，手写compare函数进行智能对比

在搭建评测机过程中，我遇到了不少问题，在此做一个小小的汇总：

1. 无法将机器码注入ROM，可能是正则表达式匹配错误，不知道正则表达式怎么写可以把$logisim$用记事本打开，喂给ai让它帮你写这一部分；
2. $nop$与$beq$信号每个人处理得不同。当指令为$nop$，$beq$时，会有很多无用的信号，比如$grf$的$WD$，$DM$的$Addr$等。这就意味着我们比对的时候不能直接使用$Python$内置的文件比较方法，而是要自己手写，提取出每个字段是哪个信号，并特殊处理选择性匹配。
3. 如果对拍过程中出现有人仅输出一行全是$0$，可能是他没有把$main$设为主电路导致的。原理不明。
4. 要想电路能停下来，可以使用计数器`counter`并连出一个输出端口`halt`，当这个端口置为1时，Logisim会自动检测到，停止仿真模拟，你的评测机就能正常返回继续下一步比对了。
5. $lw$指令后面的立即数不能太大，是有范围要求的。生成随机数据时进行限制。

下面给出一部分代码，评测机可在此处下载：

[P3Judger](/files/P3Judger.zip)

$MIPS$汇编代码生成（这段亦可用C++实现）：

```
def generate_mips_code(self, num_instructions, test_id):
    """
    生成随机的MIPS汇编代码，考虑地址限制
    """
    # 使用测试ID和时间作为随机种子，确保每次测试生成不同的代码
    random.seed(time.time() + test_id)

    instructions = []
    labels = {}  # 用于beq跳转的标签
    data_segment = []  # 数据段

    # 初始化当前PC（假设从0开始）
    self.current_pc = 0

    # 生成一些标签用于beq跳转，确保在PC范围内
    label_count = max(1, num_instructions // 10)
    for i in range(label_count):
        # 标签位置在当前PC范围内
        label_pos = random.randint(0, min(num_instructions - 1, (self.max_pc - self.current_pc) // 4))
        labels[f"label_{i}"] = label_pos

    # 添加数据段（在代码之前）
    data_size = min(32, num_instructions // 3)  # 数据大小限制
    for i in range(data_size):
        data_value = random.randint(0, 0xFFFFFFFF)
        data_segment.append(f"data_{i}: .word {data_value}")

    # 添加数据段声明
    if data_segment:
        instructions.append(".data")
        instructions.extend(data_segment)
        instructions.append("")  # 空行分隔

    # 添加代码段
    instructions.append(".text")

    # 初始化一些寄存器，避免未定义行为
    instructions.append("ori $1, $0, 0")  # 初始化$1为0
    instructions.append("ori $2, $0, 0")  # 初始化$2为0

    for i in range(num_instructions):
        # 更新当前PC（每条指令4字节）
        self.current_pc = (i + 2) * 4  # 加上初始化的2条指令

        # 随机决定是否在当前指令前插入标签
        for label_name, label_pos in labels.items():
            if label_pos == i:
                instructions.append(f"{label_name}:")

        instr_type = random.choice(['r_type', 'i_type', 'other'])

        if instr_type == 'r_type':
            # R-type指令: add, sub
            op = random.choice(self.r_type_ops)
            rd, rs, rt = random.sample(self.registers, 3)
            instructions.append(f"{op} ${rd}, ${rs}, ${rt}")

        elif instr_type == 'i_type':
            # I-type指令: ori, lw, sw, beq, lui
            op = random.choice(self.i_type_ops)

            if op == 'lui':
                # lui指令: lui rt, immediate
                rt = random.choice(self.registers)
                imm = random.randint(0, 65535)
                instructions.append(f"{op} ${rt}, {imm}")
            elif op == 'beq':
                # beq需要跳转标签，确保在PC范围内
                rs, rt = random.sample(self.registers, 2)
                if labels:
                    # 只选择在当前指令之前的标签，避免向前跳转太远
                    available_labels = {k: v for k, v in labels.items() if v < i}
                    if available_labels:
                        target_label = random.choice(list(available_labels.keys()))
                        instructions.append(f"{op} ${rs}, ${rt}, {target_label}")
                    else:
                        # 如果没有合适的标签，使用nop
                        instructions.append("nop")
                else:
                    # 如果没有标签，生成一个相对跳转，限制范围
                    max_offset = min(127, (self.max_pc - self.current_pc) // 4 - 1)
                    if max_offset > 0:
                        offset = random.randint(1, max_offset)
                        instructions.append(f"{op} ${rs}, ${rt}, {offset}")
                    else:
                        instructions.append("nop")

            elif op in ['lw', 'sw']:
                # 内存访问指令，确保在DM范围内
                rs, rt = random.sample(self.registers, 2)
                # 使用小偏移量，避免需要多条指令
                max_offset = min(124, self.max_dm) & 0xFFFC  # 确保是4的倍数且不超过范围
                if max_offset >= 4:
                    offset = random.randint(0, max_offset // 4) * 4
                    instructions.append(f"{op} ${rt}, {offset}(${rs})")
                else:
                    # 如果偏移量太小，使用ori替代
                    imm = random.randint(0, 65535)
                    instructions.append(f"ori ${rt}, ${rs}, {imm}")
            else:
                # ori指令
                rs, rt = random.sample(self.registers, 2)
                imm = random.randint(0, 65535)
                instructions.append(f"{op} ${rt}, ${rs}, {imm}")

        else:
            # 其他指令: nop
            instructions.append("nop")

        # 检查PC是否超出范围
        if self.current_pc > self.max_pc - 8:  # 留出空间给结束指令
            print(f"  ! PC接近上限，提前结束指令生成")
            break

    # 在代码末尾添加停机指令 - 使用更可靠的停机方式 - 实现j指令后可用
    #instructions.append("end_loop:")
    #instructions.append("ori $1, $0, 1")  # 设置$1=1
    #instructions.append("beq $1, $0, end_loop")  # 条件永远不成立，继续执行
    #instructions.append("j end_loop")  # 无条件跳转到循环开始

    return "\n".join(instructions)
```

调用Mars生成机器码的cmd指令格式：

```
cmd = [
    'java', '-jar', self.mars_path,
    self.asm_file,
    'nc', 'mc', 'CompactDataAtZero', 'a',
    'dump', '.text', 'HexText', self.machine_code_file
]
```

匹配ROM的正则表达式：

```
r'(addr/data: 12 32\n).*?(</a>)'
```

比较函数：

```
def compare_outputs(self):
    """
    比较两个CPU的输出结果，考虑使能信号
    输出顺序: Instr, pc, RegWrite, RegAddr, RegData, MemWrite, MemAddr, MemData
    每个32位信号被分成8个4位字段
    """
    try:
        # 读取输出文件
        with open(self.my_output, 'r') as f:
            my_output = f.readlines()
        with open(self.ref_output, 'r') as f:
            ref_output = f.readlines()

        # 比较行数
        if len(my_output) != len(ref_output):
            print(f"  我的CPU输出行数: {len(my_output)}")
            print(f"  参考CPU输出行数: {len(ref_output)}")
            return False, f"输出行数不同: 我的输出{len(my_output)}行, 参考输出{len(ref_output)}行"

        # 逐行比较
        for i, (my_line, ref_line) in enumerate(zip(my_output, ref_output)):
            my_parts = my_line.strip().split()
            ref_parts = ref_line.strip().split()

            # 检查行格式是否一致
            if len(my_parts) != len(ref_parts):
                return False, f"第{i + 1}行字段数不同:\n我的输出: {my_line.strip()} (字段数: {len(my_parts)})\n参考输出: {ref_line.strip()} (字段数: {len(ref_parts)})"

            # 根据输出顺序解析信号
            # 每个32位信号被分成8个4位字段
            # 计算每个信号的字段范围
            # Instr: 字段 0-7 (8个字段，32位)
            # pc: 字段 8-15 (8个字段，32位)
            # RegWrite: 字段 16 (1个字段，1位)
            # RegAddr: 字段 17-18 (2个字段，5位)
            # RegData: 字段 19-26 (8个字段，32位)
            # MemWrite: 字段 27 (1个字段，1位)
            # MemAddr: 字段 28-35 (8个字段，32位)
            # MemData: 字段 36-43 (8个字段，32位)

            # 提取使能信号
            my_reg_write = my_parts[16].lower()
            ref_reg_write = ref_parts[16].lower()
            my_mem_write = my_parts[27].lower()
            ref_mem_write = ref_parts[27].lower()

            # 检查是否为nop指令
            # nop指令的机器码是0x00000000
            my_instr = ''.join(my_parts[0:8])  # 合并Instr字段
            ref_instr = ''.join(ref_parts[0:8])  # 合并Instr字段

            is_nop = (my_instr == '00000000000000000000000000000000' and
                      ref_instr == '00000000000000000000000000000000')

            # 比较所有信号，但根据使能信号忽略不重要的信号
            for j in range(len(my_parts)):
                skip_comparison = False
                signal_name = ""

                # 确定信号名称和范围
                if 0 <= j <= 7:
                    signal_name = "Instr"
                elif 8 <= j <= 15:
                    signal_name = "PC"
                elif j == 16:
                    signal_name = "RegWrite"
                    # 如果是nop指令，允许RegWrite不同
                    if is_nop and my_reg_write != ref_reg_write:
                        # 检查是否一方为0，另一方为1但RegAddr为0
                        my_reg_addr = ''.join(my_parts[17:19])  # 合并RegAddr字段
                        ref_reg_addr = ''.join(ref_parts[17:19])  # 合并RegAddr字段

                        # 如果一方为0，另一方为1且RegAddr为0，允许
                        if ((my_reg_write == '0' and ref_reg_write == '1' and ref_reg_addr == '00000') or
                                (my_reg_write == '1' and ref_reg_write == '0' and my_reg_addr == '00000')):
                            skip_comparison = True
                elif 17 <= j <= 18:
                    signal_name = "RegAddr"
                    # 如果RegWrite=0，跳过RegAddr比较
                    if my_reg_write == '0' and ref_reg_write == '0':
                        skip_comparison = True
                    # 如果是nop指令且RegWrite不同，跳过比较
                    elif is_nop and my_reg_write != ref_reg_write:
                        skip_comparison = True
                elif 19 <= j <= 26:
                    signal_name = "RegData"
                    # 如果RegWrite=0，跳过RegData比较
                    if my_reg_write == '0' and ref_reg_write == '0':
                        skip_comparison = True
                    # 如果是nop指令且RegWrite不同，跳过比较
                    elif is_nop and my_reg_write != ref_reg_write:
                        skip_comparison = True
                elif j == 27:
                    signal_name = "MemWrite"
                elif 28 <= j <= 35:
                    signal_name = "MemAddr"
                    # 如果MemWrite=0，跳过MemAddr比较
                    if my_mem_write == '0' and ref_mem_write == '0':
                        skip_comparison = True
                elif 36 <= j <= 43:
                    signal_name = "MemData"
                    # 如果MemWrite=0，跳过MemData比较
                    if my_mem_write == '0' and ref_mem_write == '0':
                        skip_comparison = True
                else:
                    # 未知字段，跳过比较
                    continue

                # 跳过比较或在需要时比较
                if not skip_comparison and my_parts[j] != ref_parts[j]:
                    # 检查是否是因为使能信号不同导致的
                    if signal_name in ["RegAddr", "RegData"] and (my_reg_write != ref_reg_write):
                        return False, f"第{i + 1}行{signal_name}[字段{j}]不同且RegWrite使能信号也不同:\n我的RegWrite: {my_reg_write}, 参考RegWrite: {ref_reg_write}\n我的{signal_name}: {my_parts[j]}\n参考{signal_name}: {ref_parts[j]}"
                    elif signal_name in ["MemAddr", "MemData"] and (my_mem_write != ref_mem_write):
                        return False, f"第{i + 1}行{signal_name}[字段{j}]不同且MemWrite使能信号也不同:\n我的MemWrite: {my_mem_write}, 参考MemWrite: {ref_mem_write}\n我的{signal_name}: {my_parts[j]}\n参考{signal_name}: {ref_parts[j]}"
                    else:
                        return False, f"第{i + 1}行{signal_name}[字段{j}]不同:\n我的输出: {my_parts[j]}\n参考输出: {ref_parts[j]}"

        return True, "所有输出完全匹配"

    except Exception as e:
        return False, f"比较输出时出错: {e}"
```

## 思考题

### 思考题1

> 上面我们介绍了通过 FSM 理解单周期 CPU 的基本方法。请大家指出单周期 CPU 所用到的模块中，哪些发挥状态存储功能，哪些发挥状态转移功能。

### 解答

#### 状态存储模块

- <strong>grf</strong>（通用寄存器文件）：存储 CPU 的寄存器值，是数据状态的核心存储部分。
- <strong>DM</strong>（数据存储器）：存储数据，用于加载和存储操作，是内存状态的一部分。
- <strong>IM</strong>（指令存储器）：存储程序指令，虽然通常为只读，但作为指令的存储，它保存了 CPU 的程序状态。
- <strong>PC</strong>（程序计数器）：存当前指令地址

#### 状态转移模块

- <strong>Ctrl</strong>（控制单元）：根据当前指令生成控制信号，指导其他模块的操作，实现状态转移的控制。
- <strong>NPC</strong>（下一个程序计数器）：计算下一条指令的地址，通过增量或跳转改变程序流程，实现程序状态的转移。
- <strong>ALU</strong>（算术逻辑单元）：执行算术和逻辑运算，改变数据值，实现数据状态的转移。
- <strong>EXT</strong>（扩展单元）：对立即数进行符号扩展或零扩展，改变数据格式，实现数据状态的转移。

### 思考题2

> 现在我们的模块中 IM 使用 ROM，DM 使用 RAM，GRF 使用 Register，这种做法合理吗？ 请给出分析，若有改进意见也请一并给出。

### 解答

合理；IM只需被读取，ROM只有读取功能；DM既要进行读取，又要进行写入，但是一个周期只会进行读取和写入之一，RAM的单一地址和各一个的读写端口满足了这种要求。用寄存器也能实现DM，但是DM需要较大的空间，使用寄存器太“浪费”；GRF需要读写，且其与ALU直接连接，需要高速地读写，故使用寄存器堆搭建合理。

改进的话，在单周期CPU这应该已经是最佳方案了，在流水线CPU可以将DM改为同步读存储器。

在查阅资料后，我发现有一种将IM与DM合并，使用统一的、可读可写的主存储器的结构，也就是所谓的“冯·诺依曼架构”，但对CPU核心而言，它看到的应该仍然是分开的指令流和数据流。

对 GRF 的改进，可能需要考虑读写同步的问题，可能要规定在同一时钟边沿，读操作看到的是写操作之前的值，如果读出新值可能需要设计旁路。

### 思考题3

> 在上述提示的模块之外，你是否在实际实现时设计了其他的模块？如果是的话，请给出介绍和设计的思路。

### 解答

我将IFU模块拆开来，设计了IM，NPC两个模块，PC就是一个寄存器，直接置于顶层电路中了。IM要注意取指令的&#91;13:2&#93;位，NPC分为四块，为将来可能的J类指令保留出来。首先是直接输出$PC+4$，然后是$beq$指令判断$zero$是否为$1$决定取$PC+4$还是$PC+4+(signed)imm32$，再是$jal/j$指令拼接$PC&#91;31:28&#93;$，$imm26$，和`2'b00`，最后是$jr$直接将寄存器$RD1$的输出接上来。使用$MUX$和`NPCop`进行选择即可。

### 思考题4

> 事实上，实现 `nop` 空指令，我们并不需要将它加入控制信号真值表，为什么？

### 解答

`sll $0, $0, 0` 对应的指令码是 `0x0000_0000`，也被认为是 `nop`(空操作指令)。如果实现了$sll$，自然也就实现了$nop$。如果没有实现，那么$nop$指令输入进来电路也不会有任何变化，恰好是我们想要的。

### 思考题5

> 阅读 Pre 的[“MIPS 指令集及汇编语言”](https://d.buaa.edu.cn/http/77726476706e69737468656265737421f3e44293353526526b0988e29d51367b9787/tutorial/mips/mips-6/mips6-1/)一节中给出的测试样例，评价其强度（可从各个指令的覆盖情况，单一指令各种行为的覆盖情况等方面分析），并指出具体的不足之处。

测试样例覆盖了部分核心指令，包括逻辑操作、数据传送、算术运算和控制流指令。这对于基本功能验证有一定作用。但是指令有很多方面没有覆盖到：

- <strong>`ori` 指令</strong>：
  - 没有测试负数立即数（虽然`ori`是零扩展，但立即数字段本身可能被解释为有符号值，测试负数立即数可以验证零扩展的正确性）、立即数为0的情况，以及与其他寄存器值的交互（如所有位为0或1的寄存器）。
- <strong>`lui` 指令</strong>：
  - 没有测试立即数为0的情况，也没有验证加载后下半部分是否为0（通过`lui`和`ori`组合测试了，但单独`lui`的行为未充分测试）。
- <strong>`add` 指令</strong>：
  - 没有测试溢出情况（如两个正数相加导致负数，或两个负数相加导致正数），也没有测试0作为操作数的情况。溢出是CPU异常处理的关键，但在这个测试中被忽略。
- <strong>`sw` 和 `lw` 指令</strong>：
  - 没有测试非对齐地址访问（虽然MIPS要求字对齐，但测试边界情况是重要的）、内存映射的边界地址（如地址0x00000000或0x00002ffc）、存储和加载相同地址的数据竞争，以及不同数据模式（如全0、全1）。
- <strong>`beq` 指令</strong>：
  - 只测试了一个分支目标（`loop2`），另一个目标（`loop1`）未被访问；没有测试其他分支条件（如`bne`）；也没有测试分支与其他指令的交互；没有测试向前跳转。
