---
title: "P6课下-更复杂五级流水线CPU"
date: "2025-11-29 17:03:02"
updated: "2026-01-21 17:07:42"
categories:
  - "CO课下"
tags:
  - "CO"
  - "CO课下"
permalink: "posts/P6课下-更复杂五级流水线CPU/"
---
# CO设计文档—更复杂五级流水线CPU

P6是奖励关，难度和P5 P7不在一个档次；

## 总体设计概述

要求实现的指令集为：

```
add, sub, and, or, slt, sltu, lui
addi, andi, ori
lb, lh, lw, sb, sh, sw
mult, multu, div, divu, mfhi, mflo, mthi, mtlo
beq, bne, jal, jr
```

<strong>支持延迟槽</strong>。

整体结构如下图所示：

![](/posts/P6%E8%AF%BE%E4%B8%8B-%E6%9B%B4%E5%A4%8D%E6%9D%82%E4%BA%94%E7%BA%A7%E6%B5%81%E6%B0%B4%E7%BA%BFCPU/p7.png)

### 命名规范

- 对于元件的文件命名，均为`元件英文简称`，例如`GRF.v`，`ALU.v`等，实例化时命名为`_小写英文名`，例如`_alu`，`_grf`等
- 对于流水线寄存器文件命名为`两边的流水线层级reg`，例如`FDreg.v`，`DEreg.v`，实例化时命名相同。
- 每一级的控制信号和临时的`wire`均以本级的名称开头，如`E_ALUOp`，`M_DMwr`等
- 在流水线中参与流水的信息遵从以下约定（以D级为例）
  - `PC`和`Instr`命名以流水线层级开头，如`D_PC`，`D_Instr`
  - 寄存器地址分别为`D_A1`，`D_A3`，读出数据为`D_RD1`，`D_RD2`
  - 转发后得到的修复的寄存器数据（直接读取也视为一种转发）记作`D_fixedRD1`，`D_fixedRD2`
  - 即将写入的寄存器地址为`W_A3`，即将写入的数据记作`W_WD`，选择信号为`W_WDSel`

下面将按照流水线层级逐一分析各个单元

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

<strong>端口说明</strong>

信号名称 方向 功能描述     F&#95;PC&#91;31:0&#93; 输入 32位输入当前F级地址   zero 输入 指示b类型指令是否跳转   NPCop&#91;2:0&#93; 输入 控制信号   grf&#91;31:0&#93; 输入 <strong>处理完转发后</strong>`$rs`寄存器保存的32位地址   NPC&#91;31:0&#93; 输出 32位输出次地址

##### 控制信号说明

控制信号值 功能     $000$ `NPC=PC+4`   $001$ 执行`beq`等b类指令   $110$ 执行`j`，`jal`指令   $111$ 执行`jalr`，`jr`指令

### D级(Decode/译码)

- 本级需要处理来自E, M, W级的转发，转发信号为`EPCplus8`，`MPCplus8`，`M_ALUans`，`W_WD`，优先级按顺序排列，最低为原寄存器读出的值`D_RD1`，`D_RD2`。
- 本级的输入是来自F级的`PC`和`Instr`，输出是`D_fixedRD1`，`D_fixedRD2`，`D_ext32`，`D_PC`和`D_Instr`，还有输出到F级的`NPC`，`A3`和`PCplus8`记得一路带着。
- 本级元件较多，比较复杂

#### FD&#95;REG（F/D级流水线寄存器）

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   FD&#95;clear 输入 寄存器刷新信号（阻塞时使用）   F&#95;PC 输入 F级PC的指令地址   F&#95;Instr&#91;31:0&#93; 输入 32位的指令值   FPCplus8 输入 F&#95;PC+8   D&#95;PC 输出 D级PC的指令地址   D&#95;Instr&#91;31:0&#93; 输出 32位的指令值   DPCplus8 输出 `jal`指令要存入`$ra`的值

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

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   DE&#95;clear 输入 寄存器刷新信号（阻塞时使用）   D&#95;PC&#91;31:0&#93; 输入 D级PC的指令地址   D&#95;Instr&#91;31:0&#93; 输入 32位的指令值   D&#95;ext32&#91;31:0&#93; 输入 16位立即数经`EXT`扩展的结果   D&#95;RD1&#91;31:0&#93; 输入 32位的寄存器数据   D&#95;RD2&#91;31:0&#93; 输入 32位的寄存器数据   DPCplus8 输入 PC+8   E&#95;PC&#91;31:0&#93; 输出 E级PC的指令地址   E&#95;Instr&#91;31:0&#93; 输出 32位的指令值   E&#95;ext32&#91;31:0&#93; 输出 16位立即数经`EXT`扩展的结果   E&#95;RD1&#91;31:0&#93; 输出 32位的寄存器数据   E&#95;RD2&#91;31:0&#93; 输出 32位的寄存器数据   EPCplus8 输出 PC+8

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

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   EM&#95;clear 输入 寄存器刷新信号（阻塞时使用）   E&#95;PC&#91;31:0&#93; 输入 E级PC的指令地址   E&#95;Instr&#91;31:0&#93; 输入 32位的指令值   E&#95;fixedRD2&#91;31:0&#93; 输入 32位的寄存器数据   E&#95;ALUAns&#91;31:0&#93; 输入 32位的ALU运算结果   EPCplus8 输入 PC+8   M&#95;PC&#91;31:0&#93; 输出 M级PC的指令地址   M&#95;Instr&#91;31:0&#93; 输出 32位的指令值   M&#95;ALUAns&#91;31:0&#93; 输出 32位的ALU运算结果   M&#95;RD2&#91;31:0&#93; 输出 32位的寄存器数据   MPCplus8 输出 PC+8

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

![](/posts/P6%E8%AF%BE%E4%B8%8B-%E6%9B%B4%E5%A4%8D%E6%9D%82%E4%BA%94%E7%BA%A7%E6%B5%81%E6%B0%B4%E7%BA%BFCPU/e27b5c863cead7f2912b8885e7d38375.png) ![](/posts/P6%E8%AF%BE%E4%B8%8B-%E6%9B%B4%E5%A4%8D%E6%9D%82%E4%BA%94%E7%BA%A7%E6%B5%81%E6%B0%B4%E7%BA%BFCPU/d722038c84b1b2f3eabc92416978bb1b.png)

### 阻塞

`T_use<T_new`时阻塞。需要以下这些条件同时成立：

```
A3 != 5'b00000 & rs == A3 & T_use_rs != 4'hf & T_new != 4'h0 & D_T_use_rs < E_T_new
```

对于每一级，就加上级号，如`D_A3`。

得到阻塞信号后，`PC`，`FDreg`写使能赋$0$，`DEreg`清空。

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

本人采用Python自动生成指令程序然后手动复制进MARS汇编再复制进code.txt进行对拍。

需要注意以下几点：

- 指令数不能太多，否则MARS汇编不出来；我选择在800-1000条之间随机；
- `lw`，`sw`要尽可能缩小存储地址范围，提高命中率，避免“存进去的都取不到”；
- `jr`指令的生成。正常来说，在数据生成的过程中，会出现`jr $1`这种数据，而$1存了个很大的数，一下就跳到很远的没有指令处了。我使用两种方式生成`jr`：一种和`jal`配对，在`jal`跳完所在的指令后面多少行生成`jr $31`；第二种是和赋值语句配对，`jr $x`前绑定`add sub lui ori`之一算出`$x`，满足$x在当前指令地址-最后一条指令地址之间。
- 注意字对齐
- 限制寄存器范围，避免使用编译器需要使用的特殊寄存器，也能提升命中率。
- 立即数范围不超过$16$位（我取的$8$位），以免被当成伪指令汇编成多条，出现我们没有实现的`addu`等
- 分支测试，生成`label_i`这种标签供跳转。

Python代码：

```
import random
import struct

class PipelineTestGenerator:
    def __init__(self):
        # 指令集定义
        self.instructions = ['add', 'sub', 'ori', 'lw', 'sw', 'beq', 'lui', 'jal', 'jr', 'nop']

        # 存储器限制
        self.im_start = 0x00003000
        self.im_size = 1024  # 限制为1024条指令
        self.dm_start = 0x00000000
        self.dm_size = 3072  # 12KiB

        # 寄存器定义
        self.registers = [f'${i}' for i in range(32)]

        # 限制的寄存器范围（避免使用特殊寄存器）
        self.data_regs = [f'${i}' for i in range(1, 26)]  # $1-$25
        self.temp_regs = [f'${i}' for i in range(8, 16)]  # $8-$15 作为临时寄存器

        # 数据地址范围限制（为了增加lw/sw命中概率）
        self.data_addr_range = range(0x0000, 0x0100, 4)  # 限制在256字节范围内

        # 分支地址范围
        self.branch_range = range(-16, 17, 4)  # 缩小分支偏移范围

        # 立即数范围
        self.imm_range = range(0, 256)  # 8位立即数

        # 测试序列计数器
        self.test_count = 0
        self.label_count = 0
        self.func_count = 0

        # 已生成的指令计数
        self.generated_count = 0
        self.max_instructions = random.randint(800, 1000)  # 在800-1000条之间随机

        # 记录函数位置信息
        self.func_locations = {}  # {func_name: (start_index, end_index)}
        self.current_func = None

        # 记录指令位置
        self.instruction_positions = []

    def generate_instruction_sequence(self):
        """生成指令序列"""
        code = []

        # 初始化部分 - 设置寄存器和内存
        init_code = self._generate_initialization()
        code.extend(init_code)
        self.generated_count += len(init_code)
        self._update_instruction_positions(init_code)

        print(f"初始化代码生成完成，共 {len(init_code)} 条指令")

        # 生成测试序列
        while self.generated_count < self.max_instructions:
            # 随机选择指令类型，增加数据相关指令的概率
            instr_type = random.choices(
                ['data_related', 'control', 'memory', 'nop'],
                weights=[0.5, 0.3, 0.15, 0.05]
            )[0]

            new_code = []
            if instr_type == 'data_related':
                new_code = self._generate_data_related_pair()
            elif instr_type == 'control':
                new_code = self._generate_control_flow()
            elif instr_type == 'memory':
                new_code = self._generate_memory_access()
            else:
                new_code = ['nop']

            # 检查是否会超出限制
            if self.generated_count + len(new_code) > self.max_instructions:
                # 如果超出，用nop填充剩余空间
                remaining = self.max_instructions - self.generated_count
                if remaining > 0:
                    new_code = ['nop'] * remaining
                else:
                    break

            code.extend(new_code)
            self.generated_count += len(new_code)
            self._update_instruction_positions(new_code)

            # 每生成50条指令输出进度
            if self.generated_count % 50 == 0:
                print(f"已生成 {self.generated_count} 条指令...")

        # 添加结束代码
        final_code = self._generate_final_code()
        if self.generated_count + len(final_code) <= self.max_instructions:
            code.extend(final_code)
            self.generated_count += len(final_code)
            self._update_instruction_positions(final_code)
        else:
            # 如果空间不足，调整结束代码
            code.append("end_loop:")
            code.append("nop")
            code.append("beq $0, $0, end_loop")
            code.append("nop")
            self.generated_count += 4
            self._update_instruction_positions(["end_loop:", "nop", "beq $0, $0, end_loop", "nop"])

        print(f"最终生成 {self.generated_count} 条指令")
        return code

    def _update_instruction_positions(self, instructions):
        """更新指令位置信息"""
        for instr in instructions:
            if not instr.strip() or instr.startswith('#') or instr.endswith(':'):
                continue
            self.instruction_positions.append(
                self.generated_count - len(instructions) + len(self.instruction_positions))

    def _generate_initialization(self):
        """生成初始化代码"""
        init_code = []

        # 添加文件头注释
        init_code.append("# MIPS流水线处理器自动化测试程序")
        init_code.append("# 生成的指令序列用于测试转发、暂停和数据相关")
        init_code.append("")

        # 初始化数据寄存器
        for i, reg in enumerate(self.data_regs[:8]):  # 只初始化前8个数据寄存器
            imm = random.choice(list(self.imm_range))
            init_code.append(f"ori {reg}, $0, {imm}")

        # 初始化内存区域 - 简化版本
        base_reg = self.data_regs[0]
        for offset in [0, 4, 8]:  # 只初始化3个内存位置
            imm = random.choice(list(self.imm_range))
            temp_reg = self.temp_regs[0]
            init_code.append(f"lui {temp_reg}, {imm}")
            init_code.append(f"ori {temp_reg}, {temp_reg}, {imm}")
            init_code.append(f"sw {temp_reg}, {offset}({base_reg})")

        return init_code

    def _generate_data_related_pair(self):
        """生成数据相关指令对（用于测试转发）"""
        pair = []

        # 选择指令类型组合
        producer_types = ['add', 'sub', 'ori', 'lui', 'lw']
        consumer_types = ['add', 'sub', 'ori', 'sw']

        producer = random.choice(producer_types)
        consumer = random.choice(consumer_types)

        # 选择寄存器
        dest_reg = random.choice(self.data_regs[:8])  # 使用已初始化的寄存器
        src_reg1 = random.choice(self.data_regs[:8])
        src_reg2 = random.choice(self.data_regs[:8])
        temp_reg = random.choice(self.temp_regs)

        # 生成生产者指令
        if producer == 'add':
            pair.append(f"add {dest_reg}, {src_reg1}, {src_reg2}")
        elif producer == 'sub':
            pair.append(f"sub {dest_reg}, {src_reg1}, {src_reg2}")
        elif producer == 'ori':
            imm = random.choice(list(self.imm_range))
            pair.append(f"ori {dest_reg}, {src_reg1}, {imm}")
        elif producer == 'lui':
            imm = random.choice(list(self.imm_range))
            pair.append(f"lui {dest_reg}, {imm}")
        elif producer == 'lw':
            base_reg = random.choice(self.data_regs[:5])
            offset = random.choice([0, 4, 8])
            pair.append(f"lw {dest_reg}, {offset}({base_reg})")

        # 插入0-2条无关指令
        nop_count = random.randint(0, 2)
        for _ in range(nop_count):
            # 插入真正无关的指令（不使用目标寄存器）
            unrelated_instr = random.choice(['add', 'sub', 'ori', 'nop'])
            if unrelated_instr == 'nop':
                pair.append('nop')
            else:
                reg1 = random.choice([r for r in self.temp_regs if r != dest_reg])
                reg2 = random.choice([r for r in self.temp_regs if r != dest_reg])
                reg3 = random.choice([r for r in self.temp_regs if r != dest_reg])

                if unrelated_instr == 'add':
                    pair.append(f"add {reg1}, {reg2}, {reg3}")
                elif unrelated_instr == 'sub':
                    pair.append(f"sub {reg1}, {reg2}, {reg3}")
                else:
                    imm = random.choice(list(self.imm_range))
                    pair.append(f"ori {reg1}, {reg2}, {imm}")

        # 生成消费者指令（使用生产者产生的数据）
        if consumer == 'add':
            pair.append(f"add {temp_reg}, {dest_reg}, {src_reg1}")
        elif consumer == 'sub':
            pair.append(f"sub {temp_reg}, {dest_reg}, {src_reg1}")
        elif consumer == 'ori':
            imm = random.choice(list(self.imm_range))
            pair.append(f"ori {temp_reg}, {dest_reg}, {imm}")
        elif consumer == 'sw':
            base_reg = random.choice(self.data_regs[:5])
            offset = random.choice([0, 4, 8])
            pair.append(f"sw {dest_reg}, {offset}({base_reg})")

        return pair

    def _generate_control_flow(self):
        """生成控制流指令"""
        control_code = []

        control_type = random.choice(['beq', 'jal', 'jr_safe'])

        if control_type == 'beq':
            reg1 = random.choice(self.data_regs[:8])
            reg2 = random.choice(self.data_regs[:8])
            # 有限的分支偏移
            offset = random.choice([4, 8, 12, -4, -8, -12])
            label = f"label_{self.label_count}"
            self.label_count += 1
            control_code.append(f"beq {reg1}, {reg2}, {label}")
            control_code.append("nop")  # 延迟槽
            control_code.append(f"{label}:")

        elif control_type == 'jal':
            func_label = f"func_{self.func_count}"
            self.func_count += 1

            # 记录函数开始位置
            func_start = self.generated_count + len(control_code)

            control_code.append(f"jal {func_label}")
            control_code.append("nop")  # 延迟槽
            control_code.append(f"{func_label}:")

            # 简化的函数体
            func_body_size = random.randint(3, 8)
            for i in range(func_body_size):
                if self.generated_count + len(control_code) >= self.max_instructions - 3:
                    break

                instr_type = random.choice(['add', 'sub', 'ori', 'lw', 'sw', 'nop'])
                if instr_type == 'add':
                    reg1 = random.choice(self.temp_regs)
                    reg2 = random.choice(self.temp_regs)
                    reg3 = random.choice(self.temp_regs)
                    control_code.append(f"add {reg1}, {reg2}, {reg3}")
                elif instr_type == 'sub':
                    reg1 = random.choice(self.temp_regs)
                    reg2 = random.choice(self.temp_regs)
                    reg3 = random.choice(self.temp_regs)
                    control_code.append(f"sub {reg1}, {reg2}, {reg3}")
                elif instr_type == 'ori':
                    reg1 = random.choice(self.temp_regs)
                    reg2 = random.choice(self.temp_regs)
                    imm = random.choice(list(self.imm_range))
                    control_code.append(f"ori {reg1}, {reg2}, {imm}")
                elif instr_type == 'lw':
                    base_reg = random.choice(self.data_regs[:5])
                    dest_reg = random.choice(self.temp_regs)
                    offset = random.choice([0, 4, 8])
                    control_code.append(f"lw {dest_reg}, {offset}({base_reg})")
                elif instr_type == 'sw':
                    base_reg = random.choice(self.data_regs[:5])
                    src_reg = random.choice(self.temp_regs)
                    offset = random.choice([0, 4, 8])
                    control_code.append(f"sw {src_reg}, {offset}({base_reg})")
                else:
                    control_code.append("nop")

            # 记录函数结束位置
            func_end = self.generated_count + len(control_code)
            self.func_locations[func_label] = (func_start, func_end)

            # 安全的jr $31返回
            control_code.append("jr $31")
            control_code.append("nop")  # 延迟槽

        elif control_type == 'jr_safe':
            # 安全的jr生成方式
            jr_type = random.choice(['jal_pair', 'calc_addr'])

            if jr_type == 'jal_pair' and self.func_locations:
                # 方式1: 与jal配对，在函数内部使用jr $31
                # 这里我们已经在jal部分处理了，所以这种情况不需要额外生成
                # 改为生成一个简单的控制流
                reg1 = random.choice(self.data_regs[:8])
                reg2 = random.choice(self.data_regs[:8])
                label = f"label_{self.label_count}"
                self.label_count += 1
                control_code.append(f"beq {reg1}, {reg2}, {label}")
                control_code.append("nop")
                control_code.append(f"{label}:")

            else:
                # 方式2: 与赋值语句配对，计算合法地址
                jr_reg = random.choice(self.temp_regs)

                # 计算一个合法的跳转地址
                # 当前指令位置（估算）
                current_pos = self.generated_count + len(control_code)
                # 合法的跳转目标范围（在当前指令附近）
                target_range_start = max(0, current_pos - 20)
                target_range_end = min(self.max_instructions - 1, current_pos + 20)

                if target_range_end > target_range_start:
                    target_pos = random.randint(target_range_start, target_range_end)
                    # 转换为字节地址
                    target_addr = 0x3000 + target_pos * 4

                    # 使用lui和ori计算地址
                    upper = (target_addr >> 16) & 0xFFFF
                    lower = target_addr & 0xFFFF

                    control_code.append(f"lui {jr_reg}, {upper}")
                    control_code.append(f"ori {jr_reg}, {jr_reg}, {lower}")
                    control_code.append(f"jr {jr_reg}")
                    control_code.append("nop")  # 延迟槽
                else:
                    # 如果无法计算合法地址，生成一个简单的指令
                    control_code.append("nop")

        return control_code

    def _generate_memory_access(self):
        """生成内存访问指令序列"""
        memory_code = []

        access_type = random.choice(['lw_sw_sequence', 'multiple_access', 'simple'])

        if access_type == 'lw_sw_sequence':
            # lw后接使用数据的指令
            base_reg = random.choice(self.data_regs[:5])
            dest_reg = random.choice(self.data_regs[:8])
            offset = random.choice([0, 4, 8])

            memory_code.append(f"lw {dest_reg}, {offset}({base_reg})")

            # 插入0-2条指令
            nop_count = random.randint(0, 2)
            for _ in range(nop_count):
                memory_code.append("nop")

            # 使用加载的数据
            use_type = random.choice(['add', 'ori', 'sw'])
            if use_type == 'add':
                temp_reg = random.choice(self.temp_regs)
                memory_code.append(f"add {temp_reg}, {dest_reg}, {dest_reg}")
            elif use_type == 'ori':
                temp_reg = random.choice(self.temp_regs)
                imm = random.choice(list(self.imm_range))
                memory_code.append(f"ori {temp_reg}, {dest_reg}, {imm}")
            else:
                memory_code.append(f"sw {dest_reg}, {offset}({base_reg})")

        elif access_type == 'multiple_access':
            base_reg = random.choice(self.data_regs[:5])
            reg1 = random.choice(self.data_regs[:8])
            reg2 = random.choice(self.data_regs[:8])

            offsets = random.sample([0, 4, 8], 2)
            memory_code.append(f"lw {reg1}, {offsets[0]}({base_reg})")
            memory_code.append(f"lw {reg2}, {offsets[1]}({base_reg})")
            memory_code.append(f"add {reg1}, {reg1}, {reg2}")
            memory_code.append(f"sw {reg1}, {offsets[0]}({base_reg})")
        else:  # simple
            base_reg = random.choice(self.data_regs[:5])
            reg = random.choice(self.data_regs[:8])
            offset = random.choice([0, 4, 8])
            if random.choice([True, False]):
                memory_code.append(f"lw {reg}, {offset}({base_reg})")
            else:
                memory_code.append(f"sw {reg}, {offset}({base_reg})")

        return memory_code

    def _generate_final_code(self):
        """生成程序结束代码"""
        return [
            "",
            "# 程序结束",
            "end_loop:",
            "nop",
            "beq $0, $0, end_loop",
            "nop"
        ]

    def generate_hex_file(self, assembly_code, filename):
        """生成十六进制文件"""
        # 由于我们无法直接生成正确的机器码，这里只生成占位符
        # 实际使用时应该用Mars进行汇编

        # 计算实际指令数量（排除标签和注释）
        actual_instructions = []
        for line in assembly_code:
            line = line.strip()
            if line and not line.startswith('#') and not line.endswith(':'):
                actual_instructions.append(line)

        print(f"实际指令数量: {len(actual_instructions)}")

        # 写入简单的十六进制占位文件
        with open(filename, 'w') as f:
            f.write("v2.0 raw\n")
            # 每条指令用0占位，实际应由Mars生成
            for i in range(len(actual_instructions)):
                f.write("00000000\n")

    def generate_test_program(self, output_asm="test_program.s", output_hex="test_program.hex"):
        """生成完整的测试程序"""
        print("生成流水线测试程序...")
        print(f"目标指令数量: {self.max_instructions} 条")

        # 重置计数器
        self.generated_count = 0
        self.label_count = 0
        self.func_count = 0
        self.func_locations = {}
        self.instruction_positions = []

        # 生成汇编代码
        assembly_code = self.generate_instruction_sequence()

        # 保存汇编文件
        with open(output_asm, 'w') as f:
            for line in assembly_code:
                f.write(f"{line}\n")

        print(f"汇编代码已保存到: {output_asm}")

        # 统计实际指令数量
        actual_count = len([l for l in assembly_code if l.strip() and not l.startswith('#') and not l.endswith(':')])
        print(f"实际生成的指令数量: {actual_count}")

        # 生成十六进制文件
        self.generate_hex_file(assembly_code, output_hex)
        print(f"十六进制占位文件已保存到: {output_hex}")

        return assembly_code

# 使用示例
if __name__ == "__main__":
    # 创建测试生成器
    generator = PipelineTestGenerator()

    # 生成测试程序
    test_program = generator.generate_test_program("mips_code.asm", "mips_code.hex")

    print("\n测试程序特性:")
    print("- 指令集: add, sub, ori, lw, sw, beq, lui, jal, jr, nop")
    print(f"- 指令数量: {generator.generated_count} 条 (在800-1000条之间随机)")
    print("- 数据地址范围: 0x0000-0x00FF (提高lw/sw命中概率)")
    print("- 包含数据相关指令对测试转发")
    print("- 包含控制流指令测试分支预测和跳转")
    print("- 包含内存访问序列测试load-use相关")
    print("- 安全的jr指令生成:")
    print("  * 与jal配对，在函数内使用jr $31返回")
    print("  * 与赋值语句配对，计算合法跳转地址")
    print("- 所有地址和数值都在合法范围内")
    print("- 确保不超过1024条指令限制")
```

## 思考题

### 思考题1

> 为什么需要有单独的乘除法部件而不是整合进 ALU？为何需要有独立的 HI、LO 寄存器？

### 解答

- <strong>单独乘除法部件 (MDU) 的原因：</strong>
  1. <strong>时延差异（关键路径）：</strong> ALU 中的加减与逻辑运算通常可以在单周期内通过组合逻辑完成。而乘法和除法（尤其是除法）极其复杂，如果使用组合逻辑实现，会产生极大的延迟，从而严重拖慢整个 CPU 的时钟周期（Critical Path）。将其独立并在流水线中视为多周期部件，可以保持 CPU 主频在一个较高的水平。
  2. <strong>并行性：</strong> 现代流水线 CPU 中，乘除法部件可以独立于 ALU 工作。当 MDU 在计算耗时的除法时，后续不相关的指令（如 add, sub）可以继续流过 ALU 执行，提高了流水线的吞吐率。
- <strong>独立 HI、LO 寄存器的原因：</strong>
  1. <strong>位宽需求：</strong> 两个 32 位整数相乘，结果可能达到 64 位；32 位整数除法会产生 32 位商和 32 位余数（共 64 位）。而 MIPS 的通用寄存器（GRF）仅为 32 位，无法一次性存储运算结果。
  2. <strong>避免占用 GRF 端口：</strong> 如果将 64 位结果写入 GRF，需要占用两个寄存器号（如 $t0 和 $t1），且写入需要两个周期（或增加写端口）。使用专用的 HI/LO 寄存器可以简化 GRF 的设计，且不干扰通用寄存器的读写调度。

### 思考题2

> 真实的流水线 CPU 是如何使用实现乘除法的？请查阅相关资料进行简单说明。

### 解答

在真实的现代高性能 CPU 中，乘除法的实现比本实验更复杂：

- <strong>硬件乘法器：</strong> 通常采用 <strong>Wallace Tree</strong> 或 <strong>Dadda Tree</strong> 等压缩树结构配合 <strong>Booth 编码</strong>，并设计成流水线结构。这意味着虽然乘法延迟可能是 3-5 个周期，但吞吐量可以达到 1（即每个周期都能发射一条新的乘法指令）。
- <strong>硬件除法器：</strong> 除法较难流水线化，通常使用 <strong>SRT 算法</strong> 或 <strong>Newton-Raphson 迭代法</strong>。现代 CPU 的除法延迟仍然较高（可能 10-20+ 周期），且通常是非流水线的或部分流水线的。
- <strong>乱序执行：</strong> 遇到乘除法时，CPU 不会单纯阻塞，而是利用保留站（Reservation Station）或重排序缓冲区（ROB），让后续无关指令乱序执行，掩盖乘除法的长延迟。

### 思考题3

> 请结合自己的实现分析，你是如何处理 Busy 信号带来的周期阻塞的？

### 解答

在我的代码中，Busy 信号的处理主要体现在 MDU 模块的状态机和 Stall 模块的阻塞逻辑中：

1. <strong>Busy 的产生 (MDU.v)：</strong>  
当 start 信号有效时，MDU 内部的计数器 count 被置位（乘法 5 周期，除法 10 周期）。只要 count != 0，busy 信号就持续输出高电平 1’b1。
2. <strong>阻塞逻辑 (Stall.v)：</strong>  
我在 Stall 模块中添加了针对 MDU 的逻辑：

 ```
assign D_Stall = ... | (D_ismult & (E_start | E_busy));
```

 这里的 `D_ismult` 标识当前 D 级是否为乘除法相关指令（`mult`, `div`, `mfhi`, `mflo` 等）。  
逻辑含义是：如果 <strong>D 级是乘除法指令</strong> 且 <strong>(E 级刚开始乘除法 OR MDU 正忙)</strong>，则拉高 D&#95;Stall。
3. <strong>效果：</strong>  
这会冻结 PC 和 F/D 级流水线寄存器，并清空 D/E 级流水线寄存器（插入 NOP）。直到 MDU 计算完成，busy 变低，D 级的指令才被允许进入 E 级。这有效地防止了后续指令在 MDU 运算未完成时错误地读取 HI/LO 或打断运算

### 思考题4

> 请问采用字节使能信号的方式处理写指令有什么好处？（提示：从清晰性、统一性等角度考虑）

### 解答

1. <strong>接口统一与规范性：</strong> 无论是 sw（写字）、sh（写半字）还是 sb（写字节），CPU 与数据存储器（DM）的交互接口都保持一致（32位数据线 + 4位使能线）。不需要针对不同的写宽度设计不同的写信号（如 we&#95;byte, we&#95;half 等）。
2. <strong>简化 CPU 逻辑（清晰性）：</strong> CPU 不需要先从内存“读出旧字”，修改部分字节后再“写回新字”（Read-Modify-Write）。CPU 只需要通过 BE 模块将数据放置在正确的数据线上，并根据地址低两位生成正确的 byteen 掩码。实际的字节写入控制权交给了存储器控制器或 TB，降低了 CPU 内部逻辑的耦合度。
3. <strong>硬件映射自然：</strong> 在 FPGA 或实际电路中，Block RAM 通常就带有字节写使能端口（Byte Write Enable），这种设计直接对应物理硬件的特性。

### 思考题5

> 请思考，我们在按字节读和按字节写时，实际从 DM 获得的数据和向 DM 写入的数据是否是一字节？在什么情况下我们按字节读和按字节写的效率会高于按字读和按字写呢？

### 解答

- <strong>实际数据大小：</strong>
  - <strong>从 DM 获得的数据：</strong> 实际上是从存储器读出的<strong>一整个字（32位）</strong>。因为内存通常是按字对齐组织的。我们需要通过 DE (Data Extension) 模块根据地址低两位从中截取所需的字节，并进行符号扩展。
  - <strong>向 DM 写入的数据：</strong> 实际上也是<strong>32位数据</strong>。虽然我们只想改写一个字节，但在 `m_data_wdata` 线上，我们将该字节复制到了对应的位置（在 BE 模块中处理），并利用 `byte_en` 告诉存储器只更新那一部分。
- <strong>效率比较：</strong>
  - 在我们的 MIPS 架构中，按字节读写（`lb`/`sb`）和按字读写（`lw`/`sw`）的<strong>时钟周期数是一样的</strong>（都是 5 级流水），因此速度上没有区别。
  - <strong>效率高于按字读写的情况：</strong> 这种效率优势主要体现在<strong>空间利用率</strong>和<strong>处理非对齐数据</strong>上。例如处理字符串（`char`数组）或网络数据包时，如果强制用 `lw/sw`，需要大量的移位和掩码运算来打包/解包数据。使用 `lb/sb` 可以直接操作最小单元，代码密度更高，处理打包数据（Packed Data）时指令数更少，从这个角度看效率更高。

### 思考题6

> 为了对抗复杂性你采取了哪些抽象和规范手段？这些手段在译码和处理数据冲突的时候有什么样的特点与帮助？

### 解答

在代码中，我采取了以下手段：

1. <strong>模块化设计（高内聚低耦合）：</strong>
  - 将乘除法独立为 MDU 模块。
  - 将内存写入掩码生成独立为 BE 模块。
  - 将内存读取扩展独立为 DE 模块。
  - 这使得 mips.v 顶层只负责连线，逻辑清晰。
2. <strong>控制信号的抽象（译码器分类）：</strong>
  - 在 CTRL.v 中，我没有直接输出分散的控制位，而是定义了 loadop&#91;3:0&#93;（区分 lb, lh, lw）和 saveop&#91;3:0&#93;（区分 sb, sh, sw）。
  - 这使得 ALU、BE、DE 模块只需要判断操作类型，而不需要知道具体指令是哪一条。
3. <strong>T&#95;use / T&#95;new 时间模型：</strong>
  - 这是解决冲突最核心的抽象。我没有针对每一对 add-sub 或 lw-add 写特判，而是给每条指令定义了生成数据的时间 (T&#95;new) 和使用数据的时间 (T&#95;use)。
  - 在 Stall.v 和转发逻辑中，只需要比较数值大小 (T&#95;use &#60; T&#95;new) 即可自动覆盖所有指令组合的冒险情况。

### 思考题7

> 在本实验中你遇到了哪些不同指令类型组合产生的冲突？你又是如何解决的？相应的测试样例是什么样的？

### 解答

普通的数据冲突和结构冲突已经在P5都解决了；

对于P6的话，主要是乘除单元导致的后续指令需要阻塞D级。样例如下。

```
mult $1, $2
mfhi $3   # 应在此处阻塞直到乘法结束
```

### 思考题8

> 如果你是手动构造的样例，请说明构造策略，说明你的测试程序如何保证<strong>覆盖</strong>了所有需要测试的情况；如果你是<strong>完全随机</strong>生成的测试样例，请思考完全随机的测试程序有何不足之处；如果你在生成测试样例时采用了<strong>特殊的策略</strong>，比如构造连续数据冒险序列，请你描述一下你使用的策略如何<strong>结合了随机性</strong>达到强测的效果。

### 解答

<strong>我的测试策略：受限随机测试 (Constrained Random Testing)</strong>

我的测试程序并不是“完全随机”的，而是基于<strong>约束</strong>和<strong>状态反馈</strong>的随机生成策略。完全随机生成的二进制码或汇编代码在流水线 CPU 测试中效率极低，因为大概率会产生无效指令、除以零异常或死循环，且很难触发生僻的流水线冲突逻辑。

为了保证覆盖率并达到强测效果，我采用了以下策略结合随机性：

1. <strong>寄存器池约束（构造数据冒险）：</strong>
  - <strong>策略：</strong> 我没有从 0-31 号寄存器中均匀随机选择，而是维护了一个较小的<strong>“测试寄存器池”</strong>（`self.__test_regs`，例如只包含 14 个常用寄存器）。
  - <strong>效果：</strong> 在生成指令（如 `add $t1, $t2, $t3`）时，源寄存器（rs, rt）和目的寄存器（rd）都从这个小池子里随机选取。这极大地提高了<strong>“读后写”（RAW）</strong>相关发生的概率。因为寄存器数量少，上一条指令刚写过的寄存器，很大概率会被紧接着的下一条或下下一条指令读取，从而高频触发 <strong>E级转发、M级转发</strong> 以及 <strong>Load-Use 暂停</strong> 逻辑。
2. <strong>指令模板与权重（覆盖功能部件）：</strong>
  - <strong>策略：</strong> 我将指令分为 `cal_r` (算术), `load`, `store`, `branch`, `md` (乘除) 等类别。测试生成器会按类别随机选择，确保 ALU、DM、MDU 等部件都能被均匀覆盖，而不是随机生成一堆 `nop` 或全是 `add`。
  - <strong>效果：</strong> 保证了每种类型的指令组合（如 `乘法` 后接 `mflo`，`load` 后接 `alu`）都能出现。
3. <strong>内存地址约束（防止访存越界）：</strong>
  - <strong>策略：</strong> 在生成 `load/store` 指令时，不是随机生成 base 和 offset，而是先在 Python 内部维护一个 `grf` 镜像模型，根据基址寄存器当前的值，反向计算出一个合法的 `offset`，使得最终地址 `base + offset` 落在合法的数据存储区（0x0000-0x3000）内。
  - <strong>效果：</strong> 避免了随机测试中常见的“地址越界”导致的评测失败，使得测试能专注于 CPU 的读写逻辑是否正确。
4. <strong>边界数据注入（ALU 鲁棒性）：</strong>
  - <strong>策略：</strong> 专门设计了 `__set_inf_32bits` 等函数，在随机操作数中混入 <strong>0、最大正数、最小负数、-1</strong> 等特殊边界值。
  - <strong>效果：</strong> 强测 ALU 的加法器溢出处理（虽然 P6 忽略溢出，但结果需正确截断）、符号扩展逻辑以及乘除法的特殊情况。

<strong>总结：</strong>  
通过缩小寄存器选择范围来<strong>人为制造冲突</strong>，通过数学计算约束立即数来<strong>保证合法性</strong>，结合大规模的随机迭代（Test Times），既保证了测试的<strong>合法性</strong>，又最大化了<strong>流水线冲突</strong>的覆盖率。

### 思考题9

> &#91;P5、P6 选做&#93; 请评估我们给出的覆盖率分析模型的合理性，如有更好的方案，可一并提出。

### 解答

### 一、 覆盖率分析模型的合理性评估

#### 1. 优点与亮点

- <strong>指令分类（Abstraction）极其高效</strong>
  - <strong>合理性：</strong> MIPS指令集很大，如果枚举所有 `add -> sub`、`add -> ori` 等具体指令对，组合空间将爆炸（$N^2$）。模型将指令按功能和数据通路特征归类（如 `cal_rr`, `load`, `store`），将 $N^2$ 的复杂度降低到了 $13 \times 13$ 的类别矩阵。
  - <strong>意义：</strong> 这种抽象抓住了流水线冲突的本质：冲突取决于<strong>写入哪个寄存器、在哪个阶段写入、以及后序指令在哪个阶段读取</strong>，而不太取决于具体是 `add` 还是 `sub`。
- <strong>“转发测试有效性”的引入是点睛之笔</strong>
  - <strong>合理性：</strong> 仅仅构造出转发路径（如 E-&#62;D）是不够的。如果寄存器旧值（GRF中）和新值（转发值）相同，即使硬件转发功能损坏（导致读了旧值），测试程序也能跑通。模型明确要求“新旧值必须不同”，这有效防止了<strong>假阳性（False Positive）</strong>测试通过。
  - <strong>意义：</strong> 强迫测试数据必须动态变化，不能全 0 或全 1，提高了对数据通路多路选择器（MUX）故障的检测能力。
- <strong>元组化描述（Forwarding Quadruple / Blocking Triple）精确定义了冲突</strong>
  - <strong>合理性：</strong>
    - 转发四元组 `<产, 消, 产级, 消级>` 覆盖了所有可能的旁路路径。
    - 阻塞三元组 `<D指令, 阻塞源, 间隔>` 覆盖了 Load-Use 冒险的不同距离（间隔 0 或 1 条指令）。
  - <strong>意义：</strong> 这种定义方式直接对应硬件设计中的 `Stall` 逻辑判断条件（`Tuse` vs `Tnew`）和转发逻辑判断条件（寄存器号相等且写使能），非常贴合硬件实现的物理本质。
- <strong>评分公式设计的导向性很好</strong>
  - <strong>合理性：</strong> 公式 $60 + 40 \times (k / K&#95;{max})$ 是一个阶跃函数。只要覆盖了该类别（$k&#62;0$），起步就是 60 分。
  - <strong>意义：</strong> 这鼓励学生优先进行<strong>广度优先搜索</strong>（覆盖所有冲突类型），而不是在某一种简单的冲突上（如 `add->add`）死磕。这符合验证工程的原则：先确保存在这个逻辑，再追求逻辑的完备性。

#### 2. 潜在的不足与局限性

- <strong>数据值的覆盖率缺失（Data Value Coverage）</strong>
  - <strong>问题：</strong> 该模型只关注“指令序列结构”，不关注“操作数的值”。例如，测试程序可能全是用正数运算，却没测试负数、0、最大整数等边界情况。
  - <strong>后果：</strong> 无法检测 ALU 的功能错误（如符号扩展错误、溢出逻辑错误、特定算术操作错误）。
- <strong>具体操作码的覆盖不足（Opcode Coverage）</strong>
  - <strong>问题：</strong> `cal_rr` 包含了 `add`, `sub`, `and` 等。如果测试集只测了 `add -> sub`，虽然覆盖了 `cal_rr -> cal_rr` 这个类别，但可能 `xor` 指令的转发逻辑（比如 ALU Opcode 选择信号）有问题却没被测出来。
  - <strong>后果：</strong> 可能会漏掉特定指令独有的控制信号 bug。
- <strong>MDU 忙信号（Busy）阻塞的考量不足</strong>
  - <strong>问题：</strong> 阻塞三元组定义中似乎主要针对 Load-Use 阻塞。P6 中 `mult/div` 引起的 Busy 阻塞（结构冒险/控制逻辑阻塞）是非常关键的。如果模型忽略了 MDU 的 Start/Busy 信号冲突覆盖，是不完整的。
- <strong>按字节访存（P6 特性）的粒度不够</strong>
  - <strong>问题：</strong> `store` 类包含了 `sw, sh, sb`。在 P6 中，`sb` 和 `sh` 涉及复杂的 `BE`（Byte Enable）逻辑和 `DE`（Data Extension）逻辑。仅覆盖 `sw` 的转发可能无法发现 `lb` 转发逻辑中的位截断错误。

---

### 二、 更好的方案与改进建议

针对上述不足，提出以下改进或补充方案：

#### 1. 引入“数据翻转覆盖率” (Toggle Coverage / Corner Case)

- <strong>方案：</strong> 在评估有效转发时，不仅要求新旧值不同，还建议增加对数据位的监控。
- <strong>具体指标：</strong>
  - <strong>全0/全1覆盖：</strong> 确保操作数出现过 `0x00000000` 和 `0xFFFFFFFF`。
  - <strong>位翻转覆盖：</strong> 确保 32 位数据线上的每一位都在转发过程中发生过 `0->1` 和 `1->0` 的跳变。这能检测总线粘连故障。

#### 2. 细化指令子类与 MDU 专项覆盖

- <strong>方案：</strong>
  - <strong>Load/Store 细分：</strong> 将 `load` 分为 `load_word` (lw) 和 `load_subword` (lb/lh)，因为后者的转发/扩展逻辑更易出错。
  - <strong>MDU 状态覆盖：</strong> 增加一种“MDU 阻塞元组”，专门统计 `<乘除指令, 读/写HI_LO指令, 间隔时间>`。
  - <strong>评测标准：</strong> 必须覆盖 `Busy` 信号拉高时尝试读取 HI/LO 寄存器的情况，以及连续乘除法指令的覆盖。

#### 3. 增强“指令组合”的颗粒度 (Cross-Coverage)

- <strong>方案：</strong> 在现有的类别得分基础上，增加“操作码遍历要求”。
- <strong>具体规则：</strong> 对于类别 `<cal_rr, cal_rr>`，虽然不要求 $12 \times 12$ 种全排列，但要求类别内的<strong>每一个操作码</strong>（如 `add`, `sub`…）至少作为生产者出现一次，且至少作为消费者出现一次。
- <strong>修正公式：</strong> 如果某类指令未被遍历完全，即使 $k$ 值很高，也给予一定的分数惩罚。

#### 4. 增加“连续冲突”检测 (Chain Hazards)

- <strong>方案：</strong> 目前的模型主要关注“一对一”的冲突。建议增加对 <strong>Forwarding Chain</strong> 的评估。
- <strong>场景：</strong> `A -> B -> C`。
  - 指令 A 产生数据。
  - 指令 B 使用 A 的数据（转发 1），产生新数据。
  - 指令 C 使用 B 的数据（转发 2）。
- <strong>意义：</strong> 这种连续紧密的转发对流水线寄存器的时序压力最大，也是验证转发逻辑优先级（如 EX 级转发优于 MEM 级转发）的关键场景。
