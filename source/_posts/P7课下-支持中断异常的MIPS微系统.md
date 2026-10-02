---
title: "P7课下-支持中断异常的MIPS微系统"
date: "2025-12-01 07:09:17"
updated: "2026-01-21 17:12:04"
categories:
  - "CO课下"
tags:
  - "CO"
  - "CO课下"
permalink: "posts/P7课下-支持中断异常的MIPS微系统/"
---
# CO设计文档—支持中断异常的MIPS微系统

恭喜你，挑战者，你迎来了最终boss，你是否已经热泪盈眶百感交集？

## 总体设计概述

要求实现的指令集为：

```
add, sub, and, or, slt, sltu, lui
addi, andi, ori
lb, lh, lw, sb, sh, sw
mult, multu, div, divu, mfhi, mflo, mthi, mtlo
beq, bne, jal, jr
mfc0, mtc0, eret, syscall
```

<strong>支持延迟槽</strong>。

整体结构如下图所示：

![](/posts/P7%E8%AF%BE%E4%B8%8B-%E6%94%AF%E6%8C%81%E4%B8%AD%E6%96%AD%E5%BC%82%E5%B8%B8%E7%9A%84MIPS%E5%BE%AE%E7%B3%BB%E7%BB%9F/P7-cpu%E7%A4%BA%E6%84%8F%E5%9B%BE.png) ![](/posts/P7%E8%AF%BE%E4%B8%8B-%E6%94%AF%E6%8C%81%E4%B8%AD%E6%96%AD%E5%BC%82%E5%B8%B8%E7%9A%84MIPS%E5%BE%AE%E7%B3%BB%E7%BB%9F/b78cca4748ec39cb585be2a285fc4964.png)

### 命名规范

- 对于元件的文件命名，均为`元件英文简称`，例如`GRF.v`，`ALU.v`等，实例化时命名为`_小写英文名`，例如`_alu`，`_grf`等
- 对于流水线寄存器文件命名为`两边的流水线层级reg`，例如`FDreg.v`，`DEreg.v`，实例化时命名相同。
- 每一级的控制信号和临时的`wire`均以本级的名称开头，如`E_ALUOp`，`M_DMwr`等
- 在流水线中参与流水的信息遵从以下约定（以D级为例）
  - `PC`和`Instr`命名以流水线层级开头，如`D_PC`，`D_Instr`
  - 寄存器地址分别为`D_A1`，`D_A3`，读出数据为`D_RD1`，`D_RD2`
  - 转发后得到的修复的寄存器数据（直接读取也视为一种转发）记作`D_fixedRD1`，`D_fixedRD2`
  - 即将写入的寄存器地址为`W_A3`，即将写入的数据记作`W_WD`，选择信号为`W_WDSel`

下面将按照流水线层级逐一分析各个单元CPU

CPU部分与P6相比添加了重要模块CP0协处理器，其余的端口定义和转发、阻塞规则与P6相同，详见附带的P6设计文档，在此处不再赘述

考虑到宏观PC的处理，我把CP0协处理器放置在了M级

#### CP0协处理器

<strong>介绍</strong>

协处理器 0，包含 4 个 32 位寄存器，用于支持中断和异常。

<strong>端口定义</strong>

端口 输入/输出 位宽 描述     `addr` I 5 指定 4 个寄存器中的一个，作为写入的目标寄存器   `WD` I 32 写入寄存器的数据信号   `VPC` I 32 目前传入的下一个 EPC 值   `ExcCode` I 5 目前传入的下一个 ExcCode 值   `BD` I 32 目前传入的下一个 BD 值   `HWInt` I 6 外部硬件中断信号   `WE` I 1 写使能信号，高电平有效   `EXLclr` I 1 传入 eret 指令时将 SR 的 EXL 位置 0 ，高电平有效   `clk` I 1 时钟信号   `reset` I 1 同步复位信号   `Req` O 1 输出当前的中断请求   `EPCout` O 32 输出当前 EPC 寄存器中的值   `data` O 32 输出 A 指定的寄存器中的数据

<strong>功能定义</strong>

序号 功能名称 功能描述     1 同步复位 当时钟上升沿到来且同步复位信号有效时，将所有寄存器的值设置为 0x00000000。   2 读数据 读出 `addr` 地址对应寄存器中存储的数据到 data；当 WE 有效时会将 WD 的值会实时反馈到对应的data，当 ERET 有效时会将 EXL 置 0，即内部转发。   3 写数据 当 WE 有效且时钟上升沿到来时，将 WD 的数据写入 `addr` 对应的寄存器中。   4 中断处理 根据各种传入信号和寄存器的值判断当前是否要进行中断，将结果输出到 `Req`。

处理异常的流程如下图：

将异常码`ExcCode`、是否处于延迟槽中的判断信号`BD`和当前`PC`（如果时取指地址异常则传递错误的PC值）一直跟着流水线到达M级直至提交至CP0，由CP0综合判断分析是否响应该异常

如果需要响应该异常，则CP0输出Req信号置为1，此时FD、DE、DM、MW寄存器响应Req信号，清空`Instr`，将PC值设为0x4180，然后输入F级的NPC也被置为0x4180，下一条指令从0x4180开始执行

当外设和系统外部输入中断信号时，CP0同样也会确认是否响应该中断，然后把Req置为1，执行相同的操作

### F级(Fetch/取指令)

- 本级没有转发，阻塞时需要取消`PC`写使能
- 本级的输入有来自D级的`NPC`，本级的输出是`F_PC`和`F_Instr`，两者需要参与流水线流水

#### IFU（取指单元）

信号名称 方向 功能描述     NPC&#91;31:0&#93; 输入 待写入PC的指令地址   clk 输入 时钟信号   reset 输入 同步复位信号   PC&#95;en 输入 PC的写使能   PC&#91;31:0&#93; 输出 当前指令地址   Instr&#91;31:0&#93; 输出 32位的指令值

然后与`mips_txt.v`交互获得当前指令

```
PC _pc (.clk(clk),
		  .reset(reset),
		  .PC_en(PC_en),
		  .PC(F_PC),
		  .NPC(F_NPC)
		  );

assign i_inst_addr = F_PC;
assign F_Instr = i_inst_rdata;
```

#### NPC（次地址计算单元）

把`beq`是否执行的判断交给了D级的`CMP`，根据输入信号`zero`和控制信号`NPCop`判断是否跳转

其实`NPC`横跨了F级和D级两级，我们只输入`F_PC`即可，因为事实上`F_PC=D_PC+4`，`beq`转发的`D_PC+4+offset=F_PC+offset`。`F_PC+8`则用于流水`PC`值，后面`jal`转发的时候用

我们一路携带`PC+8`到各级，便于转发。

传入中断异常信号Req，当 `Req` 为 1 时，将输出的 `NPC` 值设置为内核地址 `0x00004180`即可。

<strong>端口说明</strong>

信号名称 方向 功能描述     F&#95;PC&#91;31:0&#93; 输入 32位输入当前F级地址   zero 输入 指示b类型指令是否跳转   NPCop&#91;2:0&#93; 输入 控制信号   grf&#91;31:0&#93; 输入 <strong>处理完转发后</strong>`$rs`寄存器保存的32位地址   NPC&#91;31:0&#93; 输出 32位输出次地址   Req 输入 中断异常

##### 控制信号说明

控制信号值 功能     $000$ `NPC=PC+4`   $001$ 执行`beq`等b类指令   $110$ 执行`j`，`jal`指令   $111$ 执行`jalr`，`jr`指令

### D级(Decode/译码)

- 本级需要处理来自E, M, W级的转发，转发信号为`EPCplus8`，`MPCplus8`，`M_ALUans`，`W_WD`，优先级按顺序排列，最低为原寄存器读出的值`D_RD1`，`D_RD2`。
- 本级的输入是来自F级的`PC`和`Instr`，输出是`D_fixedRD1`，`D_fixedRD2`，`D_ext32`，`D_PC`和`D_Instr`，还有输出到F级的`NPC`，`A3`和`PCplus8`记得一路带着。
- 本级元件较多，比较复杂

#### FD&#95;REG（F/D级流水线寄存器）

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   FD&#95;clear 输入 寄存器刷新信号（阻塞时使用）   F&#95;PC 输入 F级PC的指令地址   F&#95;Instr&#91;31:0&#93; 输入 32位的指令值   FPCplus8 输入 F&#95;PC+8   F&#95;ExcCode 输入 F级指令异常   F&#95;BD 输入 是否是延迟槽指令   Req 输入 是否有中断异常请求   D&#95;PC 输出 D级PC的指令地址   D&#95;Instr&#91;31:0&#93; 输出 32位的指令值   DPCplus8 输出 `jal`指令要存入`$ra`的值   FD&#95;ExcCode 输出 F流水至D级的异常码   D&#95;BD 输出 是否是延迟槽指令

#### D&#95;GRF（寄存器堆）

<strong>端口说明</strong>

信号名称 方向 功能描述     A1&#91;4:0&#93; 输入 5位地址输入信号，将其储存的数据读出到RD1   A2&#91;4:0&#93; 输入 5位地址输入信号，将其储存的数据读出到RD2   A3&#91;4:0&#93; 输入 5位地址输入信号，将其作为写入数据的目标寄存器   RD1&#91;31:0&#93; 输出 输出A1指定的寄存器中的32位数据   RD2&#91;31:0&#93; 输出 输出A2指定的寄存器中的32位数据   WD&#91;31:0&#93; 输入 32位数据输入信号   GRFwe 输入 写使能   clk 输入 时钟信号   reset 输入 异步复位信号，将32个寄存器中的数据清零；1：复位；0：无效

##### 控制信号说明

<strong>`D_A3slt`</strong>

从`rt`字段，`rd`字段，$0x1f$中进行选择，与P4相同，但与P4不同的是，我们A3信号需要一直带着走到W级才写寄存器。寄存器所有与<strong>写入</strong>有关的端口都应连<strong>W级信号</strong>！包括`W_GRFwe`，`W_A3`，`W_WD`。P5采用分布式译码，`D_A3slt`在`D_ctrl`模块译出，`W_GRFwe`在W级译出，`W_A3`从D级选出`D_A3`后一路跟着流水，`W_WD`是在W级通过选择而得到的。

#### D&#95;EXT（位扩展）

将16位二进制数进行零扩展或符号扩展到32位

<strong>控制信号说明</strong>

控制信号值 功能     $0$ 零扩展   $1$ 符号扩展

#### D&#95;CMP（比较器）

把原来ALU中比较值是否相等的运算移到了CMP里面，去指导`beq`这一类型的指令是否跳转

P5控制信号只有`CMP_beq=0`，现在P6扩展一个`bne`指令。

<strong>端口说明</strong>

信号名称 方向 功能描述     rs&#91;31:0&#93; 输入 <strong>处理完转发后</strong>`$rs`寄存器的值   rt&#91;31:0&#93; 输入 <strong>处理完转发后</strong>`$rt`寄存器的值   CMPOp&#91;2:0&#93; 输入 控制信号   zero 输出 指示是否跳转，输入`NPC`

<strong>控制信号</strong>

<strong>`CMPop`</strong>

控制信号值 功能     $0$ `beq`   $1$ `bne`

### E级(Execute/执行)

#### DE&#95;REG（D/E级流水线寄存器）

- 输入`D_PC,D_Instr,D_ext32`，此外上一级修正后的`D_fixedRD1`和`D_fixedRD2`的值也要参与流水，，<strong>这是由于指令序列`sw, nop, add`的存在，`sw`在M级需要使用`$rt`的数据，但是在E级不会再进行转发（因为在D级已经转发过了），因此需要让正确的`$rt`值参与流水</strong>
- 输出`E_PC,E_Instr,E_ext32,E_RD1,E_RD2`，`ALU`需要这些信息

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   DE&#95;clear 输入 寄存器刷新信号（阻塞时使用）   D&#95;PC&#91;31:0&#93; 输入 D级PC的指令地址   D&#95;Instr&#91;31:0&#93; 输入 32位的指令值   D&#95;ext32&#91;31:0&#93; 输入 16位立即数经`EXT`扩展的结果   D&#95;RD1&#91;31:0&#93; 输入 32位的寄存器数据   D&#95;RD2&#91;31:0&#93; 输入 32位的寄存器数据   DPCplus8 输入 PC+8   D&#95;ExcCode 输入 D级指令异常   D&#95;BD 输入 是否是延迟槽指令   Req 输入 是否有中断异常请求   E&#95;PC&#91;31:0&#93; 输出 E级PC的指令地址   E&#95;Instr&#91;31:0&#93; 输出 32位的指令值   E&#95;ext32&#91;31:0&#93; 输出 16位立即数经`EXT`扩展的结果   E&#95;RD1&#91;31:0&#93; 输出 32位的寄存器数据   E&#95;RD2&#91;31:0&#93; 输出 32位的寄存器数据   EPCplus8 输出 PC+8   DE&#95;ExcCode 输出 D流水至E级的异常码   E&#95;BD 输出 是否是延迟槽指令

#### E&#95;ALU（算术逻辑单元）

- 相比于P4，ALU变化不大，仅仅是去掉了$zero$输出，给了`CMP`模块。

<strong>端口说明</strong>

信号名称 方向 功能描述     A&#91;31:0&#93; 输入 32位输入运算数A   B&#91;31:0&#93; 输入 32位输入运算数B   ALUOp&#91;4:0&#93; 输入 控制信号   C&#91;31:0&#93; 输出 32位输出运算结果

<strong>控制信号说明</strong>

<strong>1. ALUOp</strong>

控制信号值 功能     $000$ 执行加法运算   $001$ 执行减法运算   $010$ 执行逻辑与运算   $011$ 执行逻辑或运算   $100$ 执行`lui`指令

<strong>2. ALUASel</strong>

控制信号值 功能     $0$ 选修正后的`E_fixedRD1`   $1$ 保留

<strong>3. ALUBSel</strong>

控制信号值 功能     $0$ 选修正后的`E_fixedRD2`   $1$ 选择立即数进行运算

#### E&#95;MDU（乘除槽）

<strong>端口说明</strong>

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 复位信号   `MDUOp[2:0]` 输入 控制信号   `InputA[31:0]` 输入 32位输入运算数A   `InputB[31:0]` 输入 32位输入运算数B   start 输入 开始运算的指示信号   busy 输出 是否处于运算过程中   HI&#91;31:0&#93; 输出 32位HI寄存器值结果   LO&#91;31:0&#93; 输出 32位LO寄存器值结果

<strong>控制信号说明</strong>

<strong>1. MDUOp</strong>

控制信号值 功能     0 乘法运算   1 除法运算   2 无符号乘法运算   3 无符号除法运算   4 `mfhi`指令   5 `mflo`指令   6 `mthi`指令，把D1的值赋给HI寄存器中   7 `mtlo`指令，把D1的值赋给LO寄存器中   8 不是乘除法运算

### M级(Memory/储存)

- 输入`E_PC,E_Instr`，此外上一级的`E_ALUAns`参与流水，即`E_ALUAns`需要参与流水，<strong>这是因为`ALUAns`是待写入或读取的内存地址</strong>，<strong>另外，上一级的修正后的rt值需要参与流水</strong>，因此还需要输入`E_fixedRD2`，<strong>这是因为`sw`指令会向内存中写入`$rt`的数据</strong>
- 输出`M_PC,M_Instr,M_ALUAns,M_DMrd`

#### EM&#95;REG（E/M级流水线寄存器）

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   EM&#95;clear 输入 寄存器刷新信号（阻塞时使用）   E&#95;PC&#91;31:0&#93; 输入 E级PC的指令地址   E&#95;Instr&#91;31:0&#93; 输入 32位的指令值   E&#95;fixedRD2&#91;31:0&#93; 输入 32位的寄存器数据   E&#95;ALUAns&#91;31:0&#93; 输入 32位的ALU运算结果   EPCplus8 输入 PC+8   E&#95;ExcCode 输入 E级指令异常   E&#95;BD 输入 是否是延迟槽指令   Req 输入 是否有中断异常请求   M&#95;PC&#91;31:0&#93; 输出 M级PC的指令地址   M&#95;Instr&#91;31:0&#93; 输出 32位的指令值   M&#95;ALUAns&#91;31:0&#93; 输出 32位的ALU运算结果   M&#95;RD2&#91;31:0&#93; 输出 32位的寄存器数据   MPCplus8 输出 PC+8   EM&#95;ExcCode 输出 E流水至M级的异常码   M&#95;BD 输出 是否是延迟槽指令

#### M&#95;DM（数据储存器）

- `DM`已经不需要自行实现，调用`mips_txt.v`中的接口即可
- 利用BE模块处理待写入数据，使其支持按半字、字节、字储存
- 利用DE模块处理DM返回的数据，使其可以按照不同要求存入寄存器

##### M&#95;BE

信号名称 方向 功能描述     `saveop[3:0]` 输入 控制信号   `addr[31:0]` 输入 地址信息，用于处理半字、字节   `data[31:0]` 输入 读取的寄存器数据，待处理   `DMwr[3:0]` 输出 控制写入半字、字节的位置   `fixed_data[31:0]` 输出 待写入数据

##### M&#95;DE

信号名称 方向 功能描述     `loadop[3:0]` 输入 控制信号   `addr[31:0]` 输入 地址信息，用于处理半字、字节   `data[31:0]` 输入 `mips_txt.v`返回的DM中的数据   `fixed_data[31:0]` 输出 处理之后的正确的读取数据

##### 与接口进行交互

```
// 与DM交互			
BE _be (.addr(M_DMaddr),
		 .data(M_DM_WD), 
		 .saveop(M_saveop), 
		 .DMwr(M_DM_bytewr),
       .fixed_data(M_fixed_DM_WD));	
DE _de  (.addr(M_DMaddr),
			.data(M_DMrd),
			.loadop(M_loadop),
			.fixed_data(M_fixedRD)
			);
assign m_inst_addr = M_PC;
assign m_data_addr = M_ALUAns;
assign m_data_addr = M_DMaddr;
assign m_data_wdata = M_fixed_DM_WD;
assign m_data_byteen = M_DM_bytewr;
assign M_DMrd = m_data_rdata;

// 正确输出GRF读写信息
assign m_inst_addr = M_PC;
assign w_inst_addr = W_PC;
assign w_grf_we    = W_GRFwe;
assign w_grf_addr  = W_A3;
assign w_grf_wdata = W_WD;
```

### W级(Write/回写)

- W级事实上与D级重合了，但是仍然需要处理向E,M级的转发

#### MW&#95;REG（M/W级流水线寄存器）

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   MW&#95;clear 输入 寄存器刷新信号（阻塞时使用）   M&#95;PC&#91;31:0&#93; 输入 M级PC的指令地址   M&#95;Instr&#91;31:0&#93; 输入 32位的指令值   M&#95;DMRD&#91;31:0&#93; 输入 从内存中读取的值   M&#95;ALUAns&#91;31:0&#93; 输入 32位的ALU运算结果   MPCplus8 输入 PC+8   W&#95;PC&#91;31:0&#93; 输出 W级PC的指令地址   W&#95;Instr&#91;31:0&#93; 输出 32位的指令值   W&#95;DMrd&#91;31:0&#93; 输出 从内存中读取的值   W&#95;ALUAns&#91;31:0&#93; 输出 32位的ALU运算结果   WPCplus8 输出 PC+8

### 控制信号

我采用分布式译码，每一级实例化一个控制器，对于所有`CTRL`均有：

指令 opcode funct NPCOp WRA3Sel WDSel EXTOp WE ALUASel ALUBSel ALUOp DMWr     <strong>add</strong> 000000 100000 000 01 00 X 1 0 0 000 0   <strong>sub</strong> 000000 100010 000 01 00 X 1 0 0 001 0   <strong>ori</strong> 001101  000 00 00 0 1 0 1 011 0   <strong>lw</strong> 100011  000 00 01 1 1 0 1 000 0   <strong>sw</strong> 101011  000 00 01 1 0 0 1 000 1   <strong>beq</strong> 000100  001 X X 1 0 0 0 001 0   <strong>lui</strong> 001111  000 00 00 X 1 0 1 100 0   <strong>jal</strong> 000011  110 10 10 0 1 0 0 0 0   <strong>jr</strong> 000000 001000 111 00 00 0 0 0 0 0 0

对于不同级的`CTRL`，我们只需连出那一级所需控制信号即可。

D级：

```
wire [1:0] D_A3slt;
wire [2:0] D_NPCop;
wire [2:0] D_CMPop;
wire D_EXTop;
wire D_GRFwe;
wire [3:0] D_t_use_rs;
wire [3:0] D_t_use_rt;
wire [3:0] D_t_new;
```

E级：

```
wire E_ALUAslt;
wire E_ALUBslt;
wire E_GRFwe;
wire [2:0] E_ALUop;
wire [3:0] E_t_use_rs;
wire [3:0] E_t_use_rt;
wire [3:0] E_t_new;
```

M级：

```
wire M_DMwr;
wire M_GRFwe;
wire [3:0] M_t_use_rs;
wire [3:0] M_t_use_rt;
wire [3:0] M_t_new;
```

W级：

```
wire [1:0] W_WDslt;
wire W_GRFwe;
wire [3:0] W_t_use_rs;
wire [3:0] W_t_use_rt;
wire [3:0] W_t_new;
```

## 冲突处理方法

### 转发

采用暴力转发和AT模型，注意由于T&#95;new和在哪一级有关，我们得让这一级的CTRL知道它处在哪一级，于是我给控制模块传入一个$t$，$t=0,1,2,3$分别代表D,E,M,W级。这样，以add的T&#95;new为例，就可以如下计算：

```
T_new=(t<=4'h2)? (4'h2-t) : 0;
```

![](/posts/P7%E8%AF%BE%E4%B8%8B-%E6%94%AF%E6%8C%81%E4%B8%AD%E6%96%AD%E5%BC%82%E5%B8%B8%E7%9A%84MIPS%E5%BE%AE%E7%B3%BB%E7%BB%9F/e27b5c863cead7f2912b8885e7d38375.png) ![](/posts/P7%E8%AF%BE%E4%B8%8B-%E6%94%AF%E6%8C%81%E4%B8%AD%E6%96%AD%E5%BC%82%E5%B8%B8%E7%9A%84MIPS%E5%BE%AE%E7%B3%BB%E7%BB%9F/d722038c84b1b2f3eabc92416978bb1b.png)

### 阻塞

`T_use<T_new`时阻塞。需要以下这些条件同时成立：

```
A3 != 5'b00000 & rs == A3 & T_use_rs != 4'hf & T_new != 4'h0 & D_T_use_rs < E_T_new
```

对于每一级，就加上级号，如`D_A3`。

得到阻塞信号后，`PC`，`FDreg`写使能赋$0$，`DEreg`清空。

P7与P6不同的是，遇到`eret`指令后续都得阻塞，所以加两行：

```
(D_eret && E_ismtc0 && E_rd == 5'b01110) ? 1'b1 :
(D_eret && M_ismtc0 && M_rd == 5'b01110) ? 1'b1 : 1'b0;
```

### MIPS,Bridge与Timer

![](/posts/P7%E8%AF%BE%E4%B8%8B-%E6%94%AF%E6%8C%81%E4%B8%AD%E6%96%AD%E5%BC%82%E5%B8%B8%E7%9A%84MIPS%E5%BE%AE%E7%B3%BB%E7%BB%9F/2de8ca541ec5476a8cca234aaaca7200.png)

### 异常码

异常与中断码 助记符与名称 指令与指令类型 描述     0 `Int` （外部中断） 所有指令 中断请求，来源于计时器与外部中断。   4 `AdEL` （取指异常） 所有指令 PC 地址未字对齐。      PC 地址超过 `0x3000 ~ 0x6ffc`。    `AdEL` （取数异常） `lw` 取数地址未与 4 字节对齐。     `lh` 取数地址未与 2 字节对齐。     `lh`, `lb` 取 Timer 寄存器的值。     load 型指令 计算地址时加法溢出。     load 型指令 取数地址超出 DM、Timer0、Timer1、中断发生器的范围。   5 `AdES` （存数异常） `sw` 存数地址未 4 字节对齐。     `sh` 存数地址未 2 字节对齐。     `sh`, `sb` 存 Timer 寄存器的值。     store 型指令 计算地址加法溢出。     store 型指令 向计时器的 Count 寄存器存值。     store 型指令 存数地址超出 DM、Timer0、Timer1、中断发生器的范围。   8 `Syscall` （系统调用） `syscall` 系统调用。   10 `RI`（未知指令） - 未知的指令码。   12 `Ov`（溢出异常） `add`, `addi`, `sub` 算术溢出。

### 有关加指令

加指令有几种类型，一般是一道R型的普通运算，一道`beq`类并清空延迟槽，一道`lw`类并卡时间。

#### 1.R型运算指令

和P4单周期CPU没有什么本质区别，主要改动Ctrl模块和ALU模块即可。

#### 2.类`beq`型清空延迟槽指令

以P5&#95;L2&#95;2022的`bonall`指令为例：

```
I:

target_offset ← sign_extend(offset||02)

Condition ← GPR[rs] + GPR[rt] = 032

GPR[31] ← PC + 8

I+1:

If condition then

	PC ← PC + target_offset

else

	NullifyCurrentInstruction()

endif
```

需要按如下步骤修改：

1. 修改CMP模块，加上一个输出端口（如`opposite`)示意现在是否满足跳转条件；同时应用上`CMPop`，虽然理论上这是一个冗余设计，因为你并不需要用`CMPop`作为MUX，是输出到一个新的端口，但这是一种保护性的设计，对于长期维护可能很乱，但是课上只要加一条指令，就非常让人安心。
2. 在CTRL模块中加入该指令。指令驱动型的最大优势在此处一览无余。一般而言，我们直接将`beq`指令下的信号复制过来即可，再扫一遍有没有需要变化的，比如如果这个指令需要写入，`A3slt`，`WDslt`，`GRFwe`就都得变。
3. 在`NPCop`中添加`input opposite`，并在assign语句的三目运算符下增加判断，一般形如：

 ```
(NPCop==3'b010 && !opposite) ? PC4:
(NPCop==3'b010 && opposite) ? F_PC+offsetbeq:
```

1. 在顶层连线。将1中端口加上流水线级别设出来（如`D_opposite`），连入`NPC`，`CMP`。有的时候是否写入寄存器、写入哪个寄存器和这个判断信号有关，那么还需连入CTRL
2. 最重要也是最容易忘的一步！！！加入`PC+8`硬编码！否则不会转发！

 ```
assign E_isPCplus8 = (E_Instr[31:26] === 6'b000011 || E_Instr[31:26]==6'b011001);
assign M_isPCplus8 = (M_Instr[31:26] === 6'b000011 || M_Instr[31:26]==6'b011001);
```
3. 如果需要增加寄存器接口（如`D_RD2`)，请务必接入转发后的数据，如`D_fixedRD2`.
4. 如果需要作为`input`传入各级CTRL，可能要把这个`condition`信号流水。一般出现于`GRFwe`不定的时候。

#### 3.类`lw`型指令与时间优化

这是最困难的一类题！我们以推荐题中最难的L5&#95;2022为例。

```
vAddr ← sign_extend(offset) + GPR[base]

pAddr ← vAddr31...2 || 02

memword ← memory[pAddr]

bit ← vAddr1

def:

countOne(x): x 中 1 的个数

countZero(x): x 中 0 的个数

memHalf ← memword15+16*bit ..16*bit

Condition ← countZero(memHalf) ≤ countOne(memHalf)

if Condition:

	GPR[rt] ← sign_extend(memHalf)

else:

	GPR[31] ← PC + 4

end if
```

首先，因为它是取出字（半字、字节）进行操作，那么我们得到操作数至少在`dm`模块才能出来。于是我们有两个选择，要么在`dm`模块加一个输出端口，在`dm`内部算出需要的结果；要么在顶层直接计算。

1. 如果使用前者，我们将新结果放入`DMans`，0数是否小于1数放入`condition`端口，相当于给dm模块加了两个输出。
2. 将`DMans`，`condition`从M级开始参与流水。
3. 在CTRL模块内增加该指令，先默认其选用rt寄存器，并写入DMans，即`\`A3slt=0`，`WDslt=3`，注意WD是多加了一个接口的。
4. 在顶层连线后，修正M级的A3和W级的WD，并将所有用到`M_A3`的地方修正。
5. 阻塞模块，遇到E级是该指令且`D_rs`或`D_rt`等于`E_A3`或$31$号寄存器时阻塞，注意阻塞的`T_use`等条件仍需写！

注意以下可能出bug的地方：

- 注意A3在M级就修正，而WD直接在选择端口加一个硬编码即可。
- 阻塞是阻塞E级！传入`E_islwer`之类的
- 注意CTRL可能不一定能照抄，比如会用到rt之类的。

## <strong>测试方案</strong>

使用$COT$评测机进行对拍。

不过使用中遇到不少问题。由于阻塞周期不同，和MARS对拍会出现timer给出的中断不一致的情况。如果能找到阻塞方式完全相同的同学，就可以实现对拍。

构造数据就是覆盖所有可能中断异常的情况，然后重点测试延迟槽有关的异常中断。

下面是一段内部异常的自测代码：

```
lw      $t0, 1($zero)
sw      $t0, 2($zero)
addi    $t0, $zero, 0x7fff
lui     $t0, 0x7fff
addi    $t1, $t0, 1
sll     $t0, $t0, 1
```

`handler`使用学长评测机里的代码：

```
# 主要处理PC异常
_quick_handle:
    mfc0 $k0, $13
    andi $k0, $k0, 0x00fc

    # 没有srl指令，这一步骤判断异常是否为0x0004
    ori	$k1, $0, 0x0010
    beq	$k0, $k1, adel_handler_quick
    nop
    
    beq $0, $0, _entry
    nop

# 入口程序
_entry:	
    mfc0 $1, $13
    ori	$k0, $0, 0x1000
    sw $sp, -4($k0)
    
    addi $k0, $k0, -256
    add $sp, $0, $k0
    
    beq $0, $0,	_save_context
    nop

# PC错误
adel_handler_quick:
    mfc0 $k0, $14
    addi $k0, $k0, -0x3000
    lui $k1, 0xffff
    ori $k1,$k1,0xe000
    and $k0,$k0,$k1
    bne $k0,$0,adel_type_2
    nop
    mfc0 $k0, $14
    andi $k0,$k0,3
    bne $k0,$0,adel_type_1
    nop
    jal _entry
    nop
    
# PC未对齐
adel_type_1:
    mfc0 $k0, $14
    andi $k0, $k0, 0xfffc
    addi $k0, $k0, 4
    mtc0 $k0, $14
    eret
    ori $1, $0, 0x1234
    
# PC超出范围
adel_type_2:
    ori $k0, $0, 0x2180
    lw $k0, 0($k0)
    mtc0 $k0,$14
    nop
    eret
    ori $1, $0, 0x1234

# 判断异常中断类型
_main_handler:
    mfc0 $k0, $13
    andi $k0, $k0, 0x00fc
    
    ori	$k1, $0, 0x0000
    beq	$k0, $k1, int_handler
    nop
    ori	$k1, $0, 0x0010
    beq	$k0, $k1, adel_handler
    nop
    ori	$k1, $0, 0x0014
    beq	$k0, $k1, ades_handler
    nop
    ori	$k1, $0, 0x0028
    beq	$k0, $k1, ri_handler
    nop
    ori	$k1, $0, 0x0030
    beq	$k0, $k1, ov_handler
    nop
    ori $k1, $0, 0x0020
    beq $k0, $k1, syscall_handler
    nop

# 判断中断类型
int_handler:
    sw $ra, 0($sp)
    addi $sp, $sp, -16
    mfc0 $v0, $12
    sw $v0, 0($sp)
    mfc0 $v0, $13
    sw $v0, 4($sp)
        
    # check INT[3]
    lw $v0, 0($sp)
    lw $v1, 4($sp)
    and	$v0, $v1, $v0
    andi $v0, $v0, 0x800
    bne	$v0, $0, timer1_handler
    nop
    
    # check INT[2]
    lw	$v0, 0($sp)
    lw	$v1, 4($sp)
    and	$v0, $v1, $v0
    andi $v0, $v0, 0x400
    bne	$v0, $0, timer0_handler
    nop
    jal interrupt_handler
    nop

# 外部中断
interrupt_handler:
    lui $k0, 0xffff
    ori $k0, $k0, 0xffff
    addi $k1, $0, 0x2180
    lw $k1, 0($k1)
    addi $k0, $0, 0x7f20
    sb $0, 0($k0)
    jal _restore_context
    nop

# Timer0中断
timer0_handler:
    lui $k0, 0xffff
    addi $k1, $0, 0x2180
    lw $k1, 0($k1) 
    addi $k0, $0, 0x7f00
    sw $0, 0($k0)
    jal _restore_context
    nop

# Timer1中断
timer1_handler:
    lui $k0, 0xffff
    ori $k0, $k0, 0x1
    addi $k1, $0, 0x2180
    lw $k1, 0($k1)
    addi $k0, $0, 0x7f10
    sw $0, 0($k0)
    jal _restore_context
    nop

# 其他AdEL异常直接跳过
adel_handler:
    mfc0 $t0, $14
    mfc0 $k0, $13
    lui	$t2, 0x8000
    and	$t3, $k0, $t2
    addi $t0, $t0, 4
    bne	$t3, $t2, adel_nxt
    nop
    addi $t0, $t0, 4
    adel_nxt:
    mtc0 $t0, $14
    jal	_restore_context
    nop

# AdES异常直接跳过
ades_handler:
    mfc0 $t0, $14
    mfc0 $k0, $13
    lui	$t2, 0x8000
    and	$t3, $k0, $t2
    addi $t0, $t0, 4
    bne	$t3, $t2, ades_nxt
    nop
    addi $t0, $t0, 4
    ades_nxt:
    mtc0 $t0, $14
    jal	_restore_context
    nop

# 未知指令直接跳过
ri_handler:
    mfc0 $t0, $14
    mfc0 $k0, $13
    lui	$t2, 0x8000
    and	$t3, $k0, $t2
    addi $t0, $t0, 4
    bne	$t3, $t2, ri_nxt
    nop
    addi $t0, $t0, 4
    ri_nxt:
    mtc0 $t0, $14
    jal	_restore_context
    nop
    
# 算术溢出直接跳过
ov_handler:
    mfc0 $t0, $14
    mfc0 $k0, $13
    lui	$t2, 0x8000
    and	$t3, $k0, $t2
    addi $t0, $t0, 4
    bne	$t3, $t2, ov_nxt
    nop
    addi $t0, $t0, 4
    ov_nxt:
    mtc0 $t0, $14
    jal	_restore_context
    nop

# 处理一下syscall直接跳过
syscall_handler:
    mfc0 $t0, $14
    mfc0 $k0, $13
    lui	$t2, 0x8000
    and	$t3, $k0, $t2
    addi $t0, $t0, 4
    bne	$t3, $t2, syscall_nxt
    nop
    addi $t0, $t0, 4
    syscall_nxt:
    mtc0 $t0, $14
    jal	_restore_context
    nop

# 返回
_restore:
    eret
    ori $1, $0, 0x1234
    
# 保存上下文
_save_context:
    sw $2, 8($sp)    
    sw $3, 12($sp)    
    sw $4, 16($sp)    
    sw $5, 20($sp)    
    sw $6, 24($sp)    
    sw $7, 28($sp)    
    sw $8, 32($sp)    
    sw $9, 36($sp)    
    sw $10, 40($sp)   
    sw $11, 44($sp)    
    sw $12, 48($sp)   
    sw $13, 52($sp)    
    sw $14, 56($sp)   
    sw $15, 60($sp)    
    sw $16, 64($sp)   
    sw $17, 68($sp)    
    sw $18, 72($sp)   
    sw $19, 76($sp)    
    sw $20, 80($sp)   
    sw $21, 84($sp)    
    sw $22, 88($sp)   
    sw $23, 92($sp)    
    sw $24, 96($sp)   
    sw $25, 100($sp)   
    sw $28, 112($sp)   
    sw $29, 116($sp)   
    sw $30, 120($sp)   
    sw $31, 124($sp)
    mfhi $k0
    sw $k0, 128($sp)
    mflo $k0
    sw $k0, 132($sp)
    jal	_main_handler
    nop
    
# 恢复上下文
_restore_context:
    addi $sp, $0, 0x1000
    addi $sp, $sp, -256
    lw $2, 8($sp)   
    lw $3, 12($sp)   
    lw $4, 16($sp)   
    lw $5, 20($sp)   
    lw $6, 24($sp)   
    lw $7, 28($sp)   
    lw $8, 32($sp)   
    lw $9, 36($sp)   
    lw $10, 40($sp)    
    lw $11, 44($sp)   
    lw $12, 48($sp)    
    lw $13, 52($sp)   
    lw $14, 56($sp)    
    lw $15, 60($sp)   
    lw $16, 64($sp)    
    lw $17, 68($sp)   
    lw $18, 72($sp)    
    lw $19, 76($sp)   
    lw $20, 80($sp)    
    lw $21, 84($sp)   
    lw $22, 88($sp)    
    lw $23, 92($sp)   
    lw $24, 96($sp)    
    lw $25, 100($sp)    
    lw $28, 112($sp)   
    lw $30, 120($sp)   
    lw $31, 124($sp)   
    lw $k0, 128($sp)
    mthi $k0
    lw $k0, 132($sp)
    mtlo $k0
    lw $29, 116($sp)
    ori $1,$0,1
    beq $0, $0, _restore	
    nop
```

## 思考题

### 思考题1

> 请查阅相关资料，说明鼠标和键盘的输入信号是如何被 CPU 知晓的？

### 解答

主要通过两种方式：<strong>轮询（Polling）</strong> 和 <strong>中断（Interrupt）</strong>。在现代操作系统中，中断是主要使用的方式。

#### 1. 轮询 (Polling)

轮询是一种相对原始和低效的方式。它的工作原理如下：

- <strong>CPU 主动查询</strong>：CPU 在其执行循环中，会周期性地、主动地去检查外设的状态。例如，CPU 会不断读取键盘控制器的某个状态寄存器。
- <strong>状态判断</strong>：如果状态寄存器中的某个标志位（例如“数据就绪”位）被设置，CPU 就知道有新的键盘输入了。
- <strong>数据读取</strong>：确认有新数据后，CPU 会从键盘控制器的数据寄存器中读取按键的扫描码（scancode），并进行处理。
- <strong>循环往复</strong>：如果没有新数据，CPU 就继续执行其他任务，过一会儿再回来查询。

<strong>缺点：</strong>

- <strong>效率低下</strong>：CPU 需要花费大量的时钟周期去执行无意义的查询操作，即使大部分时间里用户并没有操作键盘或鼠标。这浪费了宝贵的计算资源。
- <strong>响应不及时</strong>：CPU 两次查询之间存在时间间隔。如果用户在这个间隔内输入，CPU 无法立即响应，必须等到下一次查询时才能发现，导致延迟。

轮询通常只在一些简单的嵌入式系统或操作系统启动的早期阶段（此时中断系统还未初始化好）使用。

#### 2. 中断 (Interrupt)

中断是现代计算机系统处理外设交互的主流方式，它高效且响应迅速。其工作流程如下：

1. <strong>事件发生</strong>：用户按下键盘上的一个键，或者移动/点击鼠标。
2. <strong>设备控制器处理</strong>：键盘/鼠标控制器（一个专门的硬件芯片）s检测到这个物理动作，将其转换为数字信号（例如，键盘的扫描码），并将其存入自己的内部缓冲区（数据寄存器）。
3. <strong>发送中断请求 (IRQ)</strong>：设备控制器通过一根物理信号线，向 <strong>中断控制器</strong>（如经典的 8259A PIC 或现代的 APIC）发送一个中断请求（Interrupt Request, IRQ）信号。这个信号就像是设备在对 CPU “举手”，表示“我有急事找你”。
4. <strong>中断控制器通知 CPU</strong>：中断控制器接收到来自多个设备的中断请求后，会根据优先级进行仲裁，然后向 CPU 的一个特定引脚（中断引脚）发送一个中断信号。
5. <strong>CPU 响应中断</strong>：
  - CPU 在执行完当前指令后，会检查中断引脚。如果检测到中断信号，并且中断是允许的（即中断标志位未被屏蔽），CPU 就会暂停当前正在执行的程序。
  - <strong>保存现场</strong>：CPU 会自动将当前的程序计数器（PC）和一些关键寄存器（如程序状态字 PSW）的值压入内核堆栈。这是为了在处理完中断后能够准确地返回到原来的执行位置。
  - <strong>识别中断源</strong>：CPU 会向中断控制器询问是哪个设备触发了中断。中断控制器会返回一个唯一的数字，称为 <strong>中断向量号</strong>。
6. <strong>跳转到中断服务程序 (ISR)</strong>：
  - CPU 使用这个中断向量号，在内存中的一个预设的表——<strong>中断向量表（Interrupt Vector Table, IVT）</strong>——中查找对应的条目。
  - 这个表中的每个条目都存放着一个地址，指向处理特定中断的程序，这个程序被称为 <strong>中断服务程序（Interrupt Service Routine, ISR）</strong> 或中断处理程序。
  - CPU 将 PC 设置为这个 ISR 的地址，开始执行中断处理。
7. <strong>执行 ISR</strong>：
  - ISR 是操作系统内核的一部分（通常是设备驱动程序的一部分）。它会从设备控制器的数据寄存器中读取数据（如键盘扫描码）。
  - 对数据进行处理（例如，将其放入操作系统的键盘缓冲区，等待应用程序读取）。
  - 向设备控制器发送一个确认信号，表示数据已被处理，设备可以准备下一次输入。
8. <strong>恢复现场</strong>：ISR 执行完毕后，会执行一条特殊指令（如 `iret`）。这条指令会从内核堆栈中弹出之前保存的 PC 和寄存器值，将其恢复到 CPU 中。
9. <strong>返回原程序</strong>：CPU 从被中断的地方继续执行原来的程序，就好像什么都没发生过一样。

### 思考题2

> 请思考为什么我们的 CPU 处理中断异常必须是已经指定好的地址？如果你的 CPU 支持用户自定义入口地址，即处理中断异常的程序由用户提供，其还能提供我们所希望的功能吗？如果可以，请说明这样可能会出现什么问题？否则举例说明。（假设用户提供的中断处理程序合法）

### 解答

#### 1. 为什么必须是指定好的地址？

原因在于 <strong>安全</strong>、<strong>稳定</strong> 和 <strong>隔离</strong>。

- <strong>安全性 (Security)</strong>：中断和异常处理程序（Handler/ISR）通常在 <strong>内核模式（Kernel Mode）</strong> 或特权模式下运行。在这个模式下，代码拥有最高权限，可以访问所有内存、所有硬件设备，并执行所有 CPU 指令。如果允许用户程序自定义这个入口地址，就相当于给了用户程序一个直接跳转到内核模式并执行任意代码的机会。
  - <strong>恶意攻击</strong>：一个恶意程序可以将其入口地址设置为一段它自己编写的恶意代码。当中断发生时，CPU 会以最高权限执行这段恶意代码，从而绕过所有安全限制，窃取数据、破坏系统、安装病毒等。这是一种典型的 <strong>权限提升（Privilege Escalation）</strong> 攻击。
- <strong>稳定性 (Stability)</strong>：中断处理程序是系统的核心，必须编写得极其小心和健壮。它需要正确地保存和恢复现场、与硬件交互、管理系统资源。
  - <strong>系统崩溃</strong>：即使用户程序不是恶意的，其提供的处理程序也可能存在 bug。例如，它可能忘记在处理完后向中断控制器发送确认信号，导致该中断被不断触发（称为“中断风暴”），使系统完全卡死。或者，它可能没有正确恢复所有寄存器，导致返回原程序后，原程序状态被破坏，从而崩溃。如果一个用户程序的 bug 就能导致整个操作系统崩溃，那这个系统是完全不可靠的。
- <strong>隔离性 (Isolation)</strong>：现代操作系统的一个基本原则是进程隔离。一个进程的错误不应该影响到其他进程或操作系统内核。让操作系统统一管理中断处理，确保了无论哪个用户程序在运行时发生中断，处理逻辑都是一致、可靠、且与用户程序隔离的。

#### 2. 如果支持用户自定义入口地址，会怎样？

<strong>它不能提供我们所希望的功能。</strong> 我们希望的功能是一个安全、稳定、多任务的计算环境。允许用户自定义中断入口地址会彻底摧毁这个环境。

即使我们假设“用户提供的中断处理程序合法”（即没有语法错误，能运行），也会出现以下致命问题：

- <strong>问题一：权限提升与安全崩溃</strong>
  - <strong>例子</strong>：一个用户程序 `A` 想要读取另一个用户程序 `B` 的密码（这在正常情况下被内存保护机制所禁止）。`A` 可以编写一个中断处理程序，该程序的功能是“读取物理地址 `0x12345678`（假设这是程序 B 存放密码的地方）的数据，并存到 `A` 的内存里”。然后，`A` 将这个处理程序的地址设置为计时器中断的处理入口。当计时器中断发生时，CPU 会跳转到 `A` 的代码，并以内核权限执行它。`A` 就成功地绕过了所有内存保护，窃取了 `B` 的数据。整个系统的安全模型荡然无存。
- <strong>问题二：系统不稳定与资源冲突</strong>
  - <strong>例子</strong>：假设两个不同的用户程序 `P1` 和 `P2` 都想自定义同一个硬件（如磁盘）的中断处理程序。`P1` 设置了它的处理程序，开始进行磁盘读写。此时操作系统切换到 `P2` 运行，`P2` 又把中断处理程序改成了它自己的。当中断（表示 `P1` 的磁盘操作已完成）到来时，CPU 却跳转到了 `P2` 的处理程序。`P2` 的代码不知道如何处理这个中断，或者错误地处理了它，很可能导致数据损坏或系统死锁。由操作系统统一管理可以确保资源访问的一致性和正确性。
- <strong>问题三：破坏抽象与复杂性</strong>
  - 操作系统为应用程序提供了简洁的抽象接口（系统调用，如 `read`、`write`）。应用程序不需要关心底层硬件中断的细节。如果让应用程序自己处理中断，那么每个需要I/O的程序都必须包含针对特定硬件的、复杂的、低级别的中断处理代码，这将使得编程变得异常困难，且程序不具备可移植性。

<strong>结论</strong>：  
中断/异常入口地址是用户态和内核态之间的一道至关重要的“门”。这扇门必须由操作系统这位“守门员”严格把控。允许用户程序随意指定这扇门通向哪里，无异于将整个系统的钥匙交给了每一个用户程序，必然会导致安全和稳定性的灾难。因此，中断向量表（或类似的机制）必须由操作系统独占和管理，这是现代操作系统设计的基石。

### 思考题3

> 为何与外设通信需要 Bridge？

### 解答

1. <strong>地址解码与请求路由 (Address Decoding and Request Routing)</strong>
  - <strong>核心功能</strong>：CPU 采用<strong>内存映射 I/O (Memory-Mapped I/O, MMIO)</strong> 的方式与外设通信。这意味着在 CPU 的视角里，外设的控制寄存器、数据寄存器等被映射到主存地址空间中的特定地址。CPU 访问这些特殊地址就等同于访问外设。
  - <strong>桥的作用</strong>：CPU 在执行 `load` 或 `store` 指令时，只负责产生一个内存地址，并将这个请求发送到总线上。它并不关心这个地址最终对应的是物理内存（RAM）还是某个外设。系统桥的核心职责就是<strong>监视</strong>总线上的地址。当它看到一个地址时，会根据预设的地址空间划分（如题目中表格所示），来判断这个请求应该被发送给谁。
  - <strong>具体例子</strong>：
    - 如果 CPU 访问地址 `0x0000_1000`，系统桥解码后发现它在数据存储器（DM）的范围 `0x0000_0000 ~ 0x0000_2FFF` 内，于是它会将请求路由到 DM。
    - 如果 CPU 访问地址 `0x0000_7F00`，系统桥解码后发现这是计时器 0 的地址，于是它会将请求路由到计时器 0 模块，并激活相应的寄存器读写操作。
  - <strong>总结</strong>：系统桥就像一个<strong>交通警察或路由器</strong>，它根据地址这个“门牌号”，将 CPU 的访问请求精确地导向正确的目的地（内存或各种外设）。
2. <strong>模块化与可扩展性 (Modularity and Scalability)</strong>
  - 通过将地址解码逻辑集中在系统桥中，CPU 的设计可以保持简洁和通用。CPU 核心只需要关心如何生成访存请求，而不需要知道系统中有哪些外设以及它们的地址是什么。
  - 当系统需要增加或移除一个外设时，我们只需要修改系统桥的解码逻辑，而无需改动复杂的 CPU 核心。这大大增强了设计的<strong>模块化</strong>和<strong>可扩展性</strong>。
3. <strong>总线协议转换 (Bus Protocol Conversion)</strong>
  - 在更复杂的系统中，CPU 内部总线（通常速度很快）和外设总线（可能速度较慢，协议也不同，如 APB, AHB, AXI 等）之间存在差异。桥可以作为不同总线之间的<strong>协议转换器</strong>，负责同步和匹配不同总线的数据宽度、时序和信号。虽然在 P7 这个简化的系统中可能不明显，但在真实系统中这是桥的另一个关键作用。
4. <strong>隔离与解耦 (Isolation and Decoupling)</strong>
  - 系统桥将 CPU 核心与具体的物理设备实现解耦。CPU 无需关心计时器内部是如何工作的，只需通过 `load/store` 指令读写其“内存地址”即可。这种抽象使得整个系统设计更加清晰，层次分明。

综上所述，系统桥是连接 CPU 核心与系统中其他组件（内存、外设）的关键枢纽。它通过<strong>地址解码</strong>实现了统一地址空间下的请求分发，并通过<strong>模块化设计</strong>提升了系统的可扩展性和可维护性。没有桥，CPU 将无法区分和访问挂载在同一总线上的不同设备。

### 思考题4

> 请阅读官方提供的定时器源代码，阐述两种中断模式的异同，并分别针对每一种模式绘制状态移图。

### 解答

#### 1. 单次触发模式 (One-shot Mode)

- <strong>激活条件</strong>: `ctrl[2:1]` 的值为 `2'b00`。
- <strong>工作行为</strong>:
  1. 软件通过设置 `ctrl[0] = 1` 来启动定时器。
  2. 状态机从 `IDLE` -&#62; `LOAD` -&#62; `CNT` 进行转换。
  3. 在 `CNT` 状态，`count` 寄存器开始倒计时。
  4. 当 `count` 减至 1，在下一个时钟周期，状态机进入 `INT` 状态，并将内部中断标志 `_IRQ` 置为 1。
  5. 在 `INT` 状态，由于满足条件 `ctrl[2:1] == 2'b00`，硬件会执行 `ctrl[0] <= 1'b0;`。<strong>这是该模式的核心特征：定时器硬件会自动将其自身的使能位清零，从而实现自我禁用。</strong>
  6. 执行完自我禁用操作后，状态机转换回 `IDLE` 状态并保持。
- <strong>总结</strong>: 在此模式下，定时器倒计时一次，触发一次中断，然后自动停止，直到软件下一次显式地重新使能它。

#### 2. 周期性模式 (Periodic Mode)

- <strong>激活条件</strong>: `ctrl[2:1]` 的值不为 `2'b00` (即 `01`, `10`, 或 `11`)。
- <strong>工作行为</strong>:
  1. 软件通过设置 `ctrl[0] = 1` 来启动定时器。
  2. 状态机从 `IDLE` -&#62; `LOAD` -&#62; `CNT` 进行转换。
  3. 在 `CNT` 状态，`count` 寄存器开始倒计时。
  4. 当 `count` 减至 1，状态机进入 `INT` 状态，并将 `_IRQ` 置为 1。
  5. 在 `INT` 状态，由于不满足 `ctrl[2:1] == 2'b00` 的条件，硬件会执行 `else` 分支：`_IRQ <= 1'b0;`，然后转换回 `IDLE` 状态。
  6. <strong>关键在于，`ctrl[0]` 的值保持为 1 (未被硬件修改)</strong>。因此，在下一个时钟周期，当状态机处于 `IDLE` 状态时，`if(`ctrl&#91;0&#93;)`的条件立即满足，定时器会自动重新进入`LOAD&#96; 状态，开始新一轮的倒计时。
- <strong>总结</strong>: 在此模式下，定时器倒计时一次，触发一次中断，然后立即自动重新加载预设值并开始下一轮倒计时，如此循环往复，直到软件将 `ctrl[0]` 清零来主动停止它。

 ![](/posts/P7%E8%AF%BE%E4%B8%8B-%E6%94%AF%E6%8C%81%E4%B8%AD%E6%96%AD%E5%BC%82%E5%B8%B8%E7%9A%84MIPS%E5%BE%AE%E7%B3%BB%E7%BB%9F/%E5%9B%BE6.4.1%EF%BC%9ATimer%E6%A8%A1%E5%9D%97Mode0.png)

![](/posts/P7%E8%AF%BE%E4%B8%8B-%E6%94%AF%E6%8C%81%E4%B8%AD%E6%96%AD%E5%BC%82%E5%B8%B8%E7%9A%84MIPS%E5%BE%AE%E7%B3%BB%E7%BB%9F/%E5%9B%BE6.4.2%EF%BC%9ATimer%E6%A8%A1%E5%9D%97Mode1.png)

### 思考题5

> 倘若中断信号流入的时候，在检测宏观 PC 的一级如果是一条空泡（你的 CPU 该级所有信息均为空）指令，此时会发生什么问题？在此例基础上请思考：在 P7 中，清空流水线产生的空泡指令应该保留原指令的哪些信息？

### 解答

如果所有信息都为空，包括PC，那会导致`eret`返回时EPC=0，跳回到0处，而PC地址是从3000开始的，立马就又会出发地址越界的错误，从而卡死在异常处理程序里出不来。

应该保留<strong>原始指令的 PC 值</strong>和<strong>是否是延迟槽指令BD</strong>

### 思考题6

> 为什么 `jalr` 指令的两个寄存器不能相同，例如 `jalr $31, $31`？

### 解答

因为这会导致<strong>跳转的目标地址</strong>被<strong>返回地址</strong>覆盖，造成原始的跳转信息丢失。

`jalr $31, $31` 指令要做两件事：

1. <strong>跳转</strong>：读取 $31 寄存器里的地址，准备跳过去。
2. <strong>链接</strong>：把返回地址（PC+8）<strong>写回</strong>到 $31 寄存器。

<strong>问题在于</strong>：当指令执行完毕后，$31 寄存器里存的不再是原来的跳转目标地址，而是新的返回地址。原来的目标地址就被<strong>擦除</strong>了。

### 思考题7

> &#91;P7 选做&#93; 请详细描述你的测试方案及测试数据构造策略。

### 解答

见上测试方案

### 附：课下随手记，一些容易出现的bug

# P7-随手记

ExcCode这里要按顺序，可能会有点问题。

有线没定义，没连，Req连入be

笔误

如何跳转回EPC？

Stall和Req的优先级

M&#95;fixedALUans，转发用这个

clear还需要置1吗？

流水线寄存器，PC不能置0！

CTRL的RI，cp0we
