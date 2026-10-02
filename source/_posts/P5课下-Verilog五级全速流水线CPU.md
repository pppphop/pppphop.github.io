---
title: "P5课下-Verilog五级全速流水线CPU"
date: "2025-11-14 10:41:51"
updated: "2026-01-21 17:05:58"
categories:
  - "CO课下"
tags:
  - "CO"
  - "CO课下"
permalink: "posts/P5课下-Verilog五级全速流水线CPU/"
---
# CO设计文档—Verilog五级全速流水线CPU

## 总体设计概述

要求实现的指令集为`add, sub, ori, lw, sw, beq, lui, jal, jr, nop`。<strong>支持延迟槽</strong>。

整体结构如下图所示：

![](/posts/P5%E8%AF%BE%E4%B8%8B-Verilog%E4%BA%94%E7%BA%A7%E5%85%A8%E9%80%9F%E6%B5%81%E6%B0%B4%E7%BA%BFCPU/P5%E7%A4%BA%E6%84%8F%E5%9B%BE.png)

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

#### NPC（次地址计算单元）

把`beq`是否执行的判断交给了D级的`CMP`，根据输入信号`zero`和控制信号`NPCop`判断是否跳转

其实`NPC`横跨了F级和D级两级，我们只输入`F_PC`即可，因为事实上`F_PC=D_PC+4`，`beq`转发的`D_PC+4+offset=F_PC+offset`。`F_PC+8`则用于流水`PC`值，后面`jal`转发的时候用

我们一路携带`PC+8`到各级，便于转发。

<strong>端口说明</strong>

信号名称 方向 功能描述     F&#95;PC&#91;31:0&#93; 输入 32位输入当前F级地址   zero 输入 指示b类型指令是否跳转   NPCop&#91;2:0&#93; 输入 控制信号   grf&#91;31:0&#93; 输入 <strong>处理完转发后</strong>`$rs`寄存器保存的32位地址   NPC&#91;31:0&#93; 输出 32位输出次地址

##### 控制信号说明

控制信号值 功能     000 `NPC=PC+4`   001 执行`beq`等b类指令   110 执行`j`，`jal`指令   111 执行`jalr`，`jr`指令

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

从`rt`字段，`rd`字段，0𝑥1𝑓中进行选择，与P4相同，但与P4不同的是，我们A3信号需要一直带着走到W级才写寄存器。寄存器所有与<strong>写入</strong>有关的端口都应连<strong>W级信号</strong>！包括`W_GRFwe`，`W_A3`，`W_WD`。P5采用分布式译码，`D_A3slt`在`D_ctrl`模块译出，`W_GRFwe`在W级译出，`W_A3`从D级选出`D_A3`后一路跟着流水，`W_WD`是在W级通过选择而得到的。

#### D&#95;EXT（位扩展）

将16位二进制数进行零扩展或符号扩展到32位

<strong>控制信号说明</strong>

控制信号值 功能     0 零扩展   1 符号扩展

#### D&#95;CMP（比较器）

把原来ALU中比较值是否相等的运算移到了CMP里面，去指导`beq`这一类型的指令是否跳转

控制信号目前只有`CMP_beq=0`，未来可以扩展

<strong>端口说明</strong>

信号名称 方向 功能描述     rs&#91;31:0&#93; 输入 <strong>处理完转发后</strong>`$rs`寄存器的值   rt&#91;31:0&#93; 输入 <strong>处理完转发后</strong>`$rt`寄存器的值   CMPOp&#91;2:0&#93; 输入 控制信号   zero 输出 指示是否跳转，输入`NPC`

### E级(Execute/执行)

#### DE&#95;REG（D/E级流水线寄存器）

- 输入`D_PC,D_Instr,D_ext32`，此外上一级修正后的`D_fixedRD1`和`D_fixedRD2`的值也要参与流水，，<strong>这是由于指令序列`sw, nop, add`的存在，`sw`在M级需要使用`$rt`的数据，但是在E级不会再进行转发（因为在D级已经转发过了），因此需要让正确的`$rt`值参与流水</strong>
- 输出`E_PC,E_Instr,E_ext32,E_RD1,E_RD2`，`ALU`需要这些信息

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   DE&#95;clear 输入 寄存器刷新信号（阻塞时使用）   D&#95;PC&#91;31:0&#93; 输入 D级PC的指令地址   D&#95;Instr&#91;31:0&#93; 输入 32位的指令值   D&#95;ext32&#91;31:0&#93; 输入 16位立即数经`EXT`扩展的结果   D&#95;RD1&#91;31:0&#93; 输入 32位的寄存器数据   D&#95;RD2&#91;31:0&#93; 输入 32位的寄存器数据   DPCplus8 输入 PC+8   E&#95;PC&#91;31:0&#93; 输出 E级PC的指令地址   E&#95;Instr&#91;31:0&#93; 输出 32位的指令值   E&#95;ext32&#91;31:0&#93; 输出 16位立即数经`EXT`扩展的结果   E&#95;RD1&#91;31:0&#93; 输出 32位的寄存器数据   E&#95;RD2&#91;31:0&#93; 输出 32位的寄存器数据   EPCplus8 输出 PC+8

#### E&#95;ALU（算术逻辑单元）

- 相比于P4，ALU变化不大，仅仅是去掉了𝑧𝑒𝑟𝑜输出，给了`CMP`模块。

<strong>端口说明</strong>

信号名称 方向 功能描述     A&#91;31:0&#93; 输入 32位输入运算数A   B&#91;31:0&#93; 输入 32位输入运算数B   ALUOp&#91;4:0&#93; 输入 控制信号   C&#91;31:0&#93; 输出 32位输出运算结果

<strong>控制信号说明</strong>

<strong>1. ALUOp</strong>

控制信号值 功能     000 执行加法运算   001 执行减法运算   010 执行逻辑与运算   011 执行逻辑或运算   100 执行`lui`指令

<strong>2. ALUASel</strong>

控制信号值 功能     0 选修正后的`E_fixedRD1`   1 保留

<strong>3. ALUBSel</strong>

控制信号值 功能     0 选修正后的`E_fixedRD2`   1 选择立即数进行运算

### M级(Memory/储存)

- 输入`E_PC,E_Instr`，此外上一级的`E_ALUAns`参与流水，即`E_ALUAns`需要参与流水，<strong>这是因为`ALUAns`是待写入或读取的内存地址</strong>，<strong>另外，上一级的修正后的rt值需要参与流水</strong>，因此还需要输入`E_fixedRD2`，<strong>这是因为`sw`指令会向内存中写入`$rt`的数据</strong>
- 输出`M_PC,M_Instr,M_ALUAns,M_DMrd`

#### EM&#95;REG（E/M级流水线寄存器）

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 同步复位信号   EM&#95;clear 输入 寄存器刷新信号（阻塞时使用）   E&#95;PC&#91;31:0&#93; 输入 E级PC的指令地址   E&#95;Instr&#91;31:0&#93; 输入 32位的指令值   E&#95;fixedRD2&#91;31:0&#93; 输入 32位的寄存器数据   E&#95;ALUAns&#91;31:0&#93; 输入 32位的ALU运算结果   EPCplus8 输入 PC+8   M&#95;PC&#91;31:0&#93; 输出 M级PC的指令地址   M&#95;Instr&#91;31:0&#93; 输出 32位的指令值   M&#95;ALUAns&#91;31:0&#93; 输出 32位的ALU运算结果   M&#95;RD2&#91;31:0&#93; 输出 32位的寄存器数据   MPCplus8 输出 PC+8

#### M&#95;DM（数据储存器）

- `DM`与P4基本相同

<strong>端口说明</strong>

信号名称 方向 功能描述     Addr&#91;31:0&#93; 输入 待操作的内存地址   WD&#91;31:0&#93; 输入 待写入内存的值   clk 输入 时钟信号   reset 输入 异步复位信号   DMwr 输入 写使能信号；1：写入有效；0：写入无效   RD&#91;31:0&#93; 输出 输入地址指向的内存中储存的值

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

采用暴力转发和AT模型，注意由于T&#95;new和在哪一级有关，我们得让这一级的CTRL知道它处在哪一级，于是我给控制模块传入一个𝑡，𝑡=0,1,2,3分别代表D,E,M,W级。这样，以add的T&#95;new为例，就可以如下计算：

```
T_new=(t<=4'h2)? (4'h2-t) : 0;
```

![](/posts/P5%E8%AF%BE%E4%B8%8B-Verilog%E4%BA%94%E7%BA%A7%E5%85%A8%E9%80%9F%E6%B5%81%E6%B0%B4%E7%BA%BFCPU/e27b5c863cead7f2912b8885e7d38375.png) ![](/posts/P5%E8%AF%BE%E4%B8%8B-Verilog%E4%BA%94%E7%BA%A7%E5%85%A8%E9%80%9F%E6%B5%81%E6%B0%B4%E7%BA%BFCPU/d722038c84b1b2f3eabc92416978bb1b.png)

### 阻塞

`T_use<T_new`时阻塞。需要以下这些条件同时成立：

```
A3 != 5'b00000 & rs == A3 & T_use_rs != 4'hf & T_new != 4'h0 & D_T_use_rs < E_T_new
```

对于每一级，就加上级号，如`D_A3`。

得到阻塞信号后，`PC`，`FDreg`写使能赋0，`DEreg`清空。

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
5. 阻塞模块，遇到E级是该指令且`D_rs`或`D_rt`等于`E_A3`或31号寄存器时阻塞

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
- 立即数范围不超过16位（我取的8位），以免被当成伪指令汇编成多条，出现我们没有实现的`addu`等
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

> 我们使用提前分支判断的方法尽早产生结果来减少因不确定而带来的开销，但实际上这种方法并非总能提高效率，请从流水线冒险的角度思考其原因并给出一个指令序列的例子。

从流水线冒险的角度来看，提前分支判断（即在D级就决定分支是否跳转）旨在减少控制冒险带来的停顿，但这种方法并非总能提高效率，主要是因为分支判断可能依赖于尚未就绪的数据，从而引发数据冒险。具体来说，如果分支指令的条件操作数依赖于前面指令的计算结果，而该结果还在流水线中未写回寄存器文件，那么提前分支判断就无法获得正确的数据，导致流水线仍需停顿等待数据可用，从而无法避免性能损失。例如：

```
add $3,$2,$1
beq $1,$4,label
```

原本在E级的`ALU`判断出是否跳转信号`zero`，是刚好可以不用阻塞的，现在前提到D级，导致需要阻塞一拍，其实是不划算的。

### 思考题2

> 因为延迟槽的存在，对于 `jal` 等需要将指令地址写入寄存器的指令，要写回 PC + 8，请思考为什么这样设计？

在 MIPS 架构中，延迟槽（delay slot）的设计是为了优化流水线性能，减少控制冒险带来的停顿。当执行跳转指令（如 `jal`）时，跳转指令之后的指令（即延迟槽中的指令）总是会被执行，无论跳转是否发生。这是因为在流水线中，跳转指令在译码阶段（D）才能确定目标地址，但此时下一条指令已经进入取指阶段（F），为了保持流水线充满，延迟槽被用于执行一条有用的指令或空操作（`nop`）。

对于 `jal` 指令（跳转并链接），其作用是将返回地址保存到寄存器（如 `$ra`）中，以便在子程序执行完成后能正确返回。返回地址应当指向子程序调用后应该继续执行的位置。由于延迟槽的存在，`jal` 指令之后的延迟槽指令会被执行，因此返回地址必须指向延迟槽之后的那条指令，即 `PC + 8`。

### 思考题3

> 我们要求所有转发数据都来源于流水寄存器而不能是功能部件（如 DM、ALU），请思考为什么？

<strong>保证时序稳定与设计简化。</strong>

1. <strong>时序稳定（关键原因）</strong>：功能部件（如 ALU）的输出是组合逻辑的结果，在时钟周期结束前可能是不稳定的。流水线寄存器在时钟边沿捕获数据，能为本时钟周期提供<strong>稳定不变</strong>的数据源。如果直接从 ALU 转发，数据在周期内变化会导致冒险逻辑判断错误和结果不可靠。
2. <strong>设计简化</strong>：所有转发数据都来自固定的寄存器（如 E/M、M/W），为转发网络提供了统一、干净的接口。如果允许从功能部件直接转发，会引入大量复杂且时序各异的路径，极大地增加了设计和验证的难度。

### 思考题4

> 我们为什么要使用 GPR 内部转发？该如何实现？

为了解决”写后读”（RAW）数据冒险。当连续两条指令对同一寄存器进行写和读时，避免流水线停顿，确保后续指令能立即获取刚写入的值。

实现实际就是W-&#62;D级的转发通路。

### 思考题5

> 我们转发时数据的需求者和供给者可能来源于哪些位置？共有哪些转发数据通路？

需求者：`DEreg`流水线寄存器，E级的ALU，M级的DM&#95;WD。

供给者：`EPCplus8`，`MPCplus8`，`M_ALUans`，`W_WD`

一共有3×5=15条数据通路，共用一下一共5个转发MUX。

### 思考题6

> 在课上测试时，我们需要你现场实现新的指令，对于这些新的指令，你可能需要在原有的数据通路上做哪些扩展或修改？提示：你可以对指令进行分类，思考每一类指令可能修改或扩展哪些位置。

<strong>新指令的扩展/修改方案：</strong>

#### 1. R型算术逻辑指令（如 and, xor）

- <strong>执行阶段</strong>：扩展ALU功能，添加新运算
- <strong>控制信号</strong>：更新ALU控制逻辑
- <strong>无需修改数据通路结构</strong>

#### 2. I型立即数指令（如 andi, addiu）

- <strong>译码阶段</strong>：扩展立即数处理（符号/零扩展选择）
- <strong>控制信号</strong>：新增ExtOp信号控制扩展方式
- <strong>执行阶段</strong>：确保立即数正确输入ALU

#### 3. 移位指令（如 sllv, sra）

- <strong>执行阶段</strong>：添加移位器或扩展ALU移位功能
- <strong>数据通路</strong>：增加移位数量输入路径（寄存器或立即数）
- <strong>控制信号</strong>：新增移位类型控制

#### 4. 访存指令（如 lb, sh）

- <strong>存储阶段</strong>：扩展DM支持字节/半字访问
- <strong>控制信号</strong>：新增MemSize信号
- <strong>写回阶段</strong>：添加加载数据扩展逻辑（符号/零扩展）

#### 5. 分支指令（如 bne, blez）

- <strong>译码阶段</strong>：扩展比较器功能（≠、≤等）
- <strong>控制信号</strong>：新增BranchType信号
- <strong>PC计算</strong>：可能增加新的目标地址计算路径

#### 6. 特殊指令（如 mul, mfhi）

- <strong>执行阶段</strong>：可能添加专用功能单元（乘除法器）
- <strong>寄存器文件</strong>：可能扩展特殊寄存器（HI/LO）
- <strong>数据通路</strong>：新增特殊寄存器读写路径

#### 7.考场上的神秘指令

往往需要我们取出什么什么，进行一个怎样的运算，相等则跳转否则存入哪哪哪，那么我们要记住，凡是增加的借口都要考虑转发；要计算出该指令的AT模型表，以便看出是否需要阻塞。

### 思考题7

> 简要描述你的译码器架构，并思考该架构的优势以及不足。

我使用分布式译码，在每一级译出需要的信号。传入𝑡让CTRL知道自己在哪一级，便于译出T&#95;new

#### 控制信号分类

- <strong>NPC控制</strong>：分支跳转类型（NPCop）
- <strong>寄存器控制</strong>：写使能（GRFwe）、目标地址选择（A3slt）、写数据选择（WDslt）
- <strong>运算控制</strong>：ALU操作（ALUop）、输入选择（ALUAslt、ALUBslt）
- <strong>内存控制</strong>：存储器写使能（DMwr）
- <strong>立即数控制</strong>：扩展方式（EXTop）
- <strong>比较控制</strong>：比较操作（CMPop）
- <strong>冒险检测</strong>：输出`T_use_rs`、`T_use_rt`、`T_new`用于流水线冒险检测

#### 优势

1. <strong>时序优化</strong>
  - 控制信号与对应流水级同步，减少组合逻辑延迟
  - 避免了长距离控制信号传输
2. <strong>模块化设计</strong>
  - 各阶段控制器独立，便于调试和修改
  - 新指令只需在对应阶段添加控制逻辑
3. <strong>冒险处理完善</strong>
  - 集成T-use/T-new机制，支持精确的冒险检测
  - 为转发和停顿提供准确的时间信息
4. <strong>简洁性</strong>
  - 每个阶段只生成需要的控制信号
  - 减少不必要的信号传输

#### 不足

1. <strong>代码冗余</strong>
  - 相同的指令在不同阶段需要重复译码
  - 控制逻辑分散，维护成本较高
2. <strong>一致性风险</strong>
  - 多实例可能导致控制信号不一致
  - 指令修改需要在所有CTRL实例中同步更新
3. <strong>扩展性限制</strong>
  - 新指令需要修改多个阶段的控制器
  - 控制信号数量固定，难以适应复杂指令集
4. <strong>时序分析复杂</strong>
  - 需要确保所有CTRL实例的时序一致性
  - 冒险检测逻辑依赖多个阶段的T值同步
5. <strong>资源占用</strong>
  - 多个CTRL实例增加硬件资源消耗
  - 控制逻辑重复导致面积开销

### 思考题8

> &#91;P5 选做&#93; 请详细描述你的测试方案及测试数据构造策略。

测试方案见上方<em>测试方案</em>段落。下面给出生成的一组测试样例：

```
ori $1, $0, 232
ori $2, $0, 176
ori $3, $0, 234
ori $4, $0, 191
ori $5, $0, 224
ori $6, $0, 65
ori $7, $0, 70
ori $8, $0, 100
lui $8, 41
ori $8, $8, 41
sw $8, 0($1)
lui $8, 228
ori $8, $8, 228
sw $8, 4($1)
lui $8, 143
ori $8, $8, 143
sw $8, 8($1)
ori $2, $6, 33
add $8, $10, $12
add $10, $2, $6
add $7, $7, $7
add $8, $7, $7
beq $6, $7, label_0
nop
label_0:
add $4, $5, $5
sub $12, $4, $5
nop
jal func_0
nop
func_0:
sub $9, $10, $10
sub $10, $9, $11
sub $8, $12, $15
add $10, $8, $10
sw $11, 8($1)
nop
nop
jr $31
nop
lui $10, 0
ori $10, $10, 12496
jr $10
nop
add $8, $6, $7
sub $13, $13, $9
ori $14, $8, 7
lui $2, 80
add $8, $15, $12
sub $10, $14, $13
sub $14, $2, $4
add $3, $8, $2
ori $15, $10, 164
sw $3, 4($1)
jal func_1
nop
func_1:
sw $11, 4($1)
sw $9, 8($4)
nop
sw $15, 4($5)
sw $13, 4($1)
nop
ori $11, $10, 96
jr $31
nop
ori $4, $4, 220
add $10, $11, $10
sub $10, $13, $15
ori $13, $4, 117
lw $2, 4($4)
lw $5, 8($4)
add $2, $2, $5
sw $2, 4($4)
lw $5, 0($5)
lw $3, 8($5)
add $5, $5, $3
sw $5, 0($5)
ori $4, $6, 220
sub $10, $4, $6
beq $3, $1, label_1
nop
label_1:
lui $3, 130
ori $11, $14, 77
add $14, $11, $15
sub $13, $3, $5
lw $5, 8($2)
add $15, $5, $2
lw $3, 0($4)
ori $13, $9, 175
add $15, $3, $5
nop
jal func_2
nop
func_2:
lw $10, 8($4)
sub $11, $9, $12
sub $11, $10, $11
add $8, $11, $14
add $14, $11, $8
jr $31
nop
lw $5, 4($2)
lw $5, 0($2)
add $5, $5, $5
sw $5, 4($2)
lui $14, 0
ori $14, $14, 12720
jr $14
nop
jal func_3
nop
func_3:
lw $11, 0($5)
add $15, $12, $10
lw $12, 0($1)
jr $31
nop
lw $2, 0($5)
nop
add $11, $2, $7
ori $3, $5, 168
ori $14, $12, 193
ori $10, $8, 221
sw $3, 8($4)
lw $1, 0($4)
lw $1, 4($4)
add $1, $1, $1
sw $1, 0($4)
sub $7, $4, $4
add $9, $14, $8
ori $12, $14, 155
sub $12, $7, $4
nop
ori $3, $6, 84
sub $10, $3, $6
lw $3, 8($4)
lw $6, 4($4)
add $3, $3, $6
sw $3, 8($4)
lw $6, 4($1)
lui $2, 203
sub $14, $12, $11
add $13, $13, $8
ori $11, $2, 55
add $1, $8, $7
ori $15, $9, 4
nop
sw $1, 4($3)
jal func_4
nop
func_4:
lw $13, 4($4)
ori $12, $14, 83
lw $15, 8($5)
sw $13, 8($1)
jr $31
nop
nop
add $4, $4, $4
sw $4, 0($3)
add $8, $3, $8
add $12, $12, $10
add $12, $8, $3
lw $1, 4($2)
ori $14, $1, 39
lw $6, 8($5)
lui $11, 0
ori $11, $11, 12920
jr $11
nop
lw $8, 0($5)
add $13, $10, $12
ori $14, $11, 171
add $10, $8, $1
add $1, $7, $3
sub $10, $10, $12
add $15, $1, $7
lui $7, 224
sw $7, 0($2)
ori $6, $4, 19
ori $9, $10, 254
sub $9, $9, $15
sub $14, $6, $4
lui $3, 115
sub $10, $14, $8
ori $15, $3, 45
nop
ori $1, $7, 72
nop
sw $1, 0($2)
add $7, $3, $2
add $9, $7, $3
beq $7, $8, label_2
nop
label_2:
add $3, $8, $3
add $10, $11, $11
nop
sw $3, 8($1)
nop
sub $5, $7, $3
sub $15, $5, $7
beq $8, $1, label_3
nop
label_3:
lw $3, 8($2)
sub $3, $7, $5
ori $12, $15, 66
ori $10, $3, 8
add $6, $1, $5
sw $6, 0($3)
lw $3, 0($5)
add $13, $3, $4
lw $5, 0($5)
nop
sub $10, $8, $14
add $8, $5, $7
lw $7, 8($2)
add $13, $15, $8
sub $14, $15, $9
add $13, $7, $6
sub $1, $6, $2
sub $15, $8, $11
add $11, $1, $6
lui $3, 132
sub $15, $10, $15
sub $14, $12, $11
sub $8, $3, $6
sub $2, $1, $1
sub $13, $9, $14
add $8, $12, $15
sw $2, 4($3)
ori $7, $5, 7
add $14, $14, $15
add $15, $15, $10
ori $9, $7, 50
jal func_5
nop
func_5:
add $12, $10, $10
sub $14, $15, $14
sw $12, 0($2)
lw $9, 0($4)
lw $13, 0($3)
add $14, $14, $9
sw $13, 8($2)
jr $31
nop
lw $8, 0($5)
add $12, $8, $8
lui $2, 181
sub $9, $12, $13
ori $8, $2, 43
lui $8, 65
add $9, $14, $15
add $14, $8, $1
beq $2, $1, label_4
nop
label_4:
ori $1, $7, 108
sub $12, $10, $12
ori $10, $1, 212
nop
ori $8, $8, 148
add $14, $14, $14
sub $10, $10, $14
sw $8, 8($5)
lw $2, 0($5)
nop
sw $2, 0($2)
beq $3, $5, label_5
nop
label_5:
sub $1, $6, $4
sub $8, $1, $6
jal func_6
nop
func_6:
nop
sw $14, 0($4)
nop
add $13, $9, $11
nop
ori $10, $13, 235
ori $9, $15, 228
jr $31
nop
lw $3, 8($2)
ori $9, $3, 31
jal func_7
nop
func_7:
ori $9, $10, 233
add $12, $12, $10
sub $11, $8, $11
nop
lw $14, 4($1)
ori $13, $9, 229
jr $31
nop
ori $1, $8, 83
add $14, $1, $8
sub $3, $1, $6
sub $11, $14, $13
sub $10, $15, $8
sub $9, $3, $1
lw $7, 0($2)
nop
nop
sw $7, 0($2)
beq $2, $4, label_6
nop
label_6:
ori $4, $3, 167
sub $12, $15, $8
ori $8, $4, 64
jal func_8
nop
func_8:
nop
lw $10, 4($2)
sw $15, 4($2)
sw $8, 4($3)
ori $9, $14, 55
jr $31
nop
jal func_9
nop
func_9:
ori $10, $12, 30
lw $9, 8($2)
ori $8, $10, 140
lw $13, 0($1)
sw $13, 4($1)
sub $13, $13, $12
jr $31
nop
lui $7, 149
ori $11, $11, 181
ori $11, $7, 83
add $3, $1, $8
ori $14, $8, 108
sub $14, $14, $13
sw $3, 0($5)
ori $5, $3, 120
ori $14, $5, 253
nop
lw $6, 8($2)
lw $8, 4($3)
nop
add $8, $8, $8
lui $9, 0
ori $9, $9, 13688
jr $9
nop
lui $8, 90
nop
add $10, $13, $14
ori $13, $8, 227
nop
sw $5, 4($3)
add $2, $5, $2
nop
sub $15, $9, $13
add $12, $2, $5
ori $8, $6, 130
sw $8, 0($1)
nop
sub $2, $7, $4
sub $10, $13, $13
sub $14, $2, $7
beq $2, $1, label_7
nop
label_7:
lw $7, 8($5)
lw $4, 4($5)
add $7, $7, $4
sw $7, 8($5)
jal func_10
nop
func_10:
sub $15, $11, $14
add $9, $15, $15
nop
lw $15, 0($4)
ori $9, $13, 36
nop
nop
add $9, $15, $12
jr $31
nop
lw $1, 0($3)
nop
ori $11, $11, 25
sw $1, 8($1)
add $1, $2, $2
sub $14, $13, $14
ori $8, $10, 88
add $10, $1, $2
beq $1, $8, label_8
nop
label_8:
beq $3, $6, label_9
nop
label_9:
lw $7, 8($5)
ori $14, $7, 140
sub $6, $1, $2
ori $9, $10, 96
sub $14, $6, $1
lw $5, 8($2)
add $3, $8, $7
add $13, $9, $12
add $14, $12, $13
sw $3, 4($3)
beq $7, $4, label_10
nop
label_10:
lw $8, 0($2)
beq $5, $8, label_11
nop
label_11:
sub $3, $1, $4
add $9, $3, $1
lw $7, 0($5)
ori $14, $7, 108
ori $4, $6, 63
ori $15, $15, 151
add $9, $8, $10
sub $13, $4, $6
lw $7, 4($5)
beq $4, $4, label_12
nop
label_12:
lui $6, 245
sw $6, 0($5)
lw $8, 4($2)
nop
add $12, $14, $9
sw $8, 8($5)
sub $5, $2, $5
add $13, $14, $8
sub $11, $14, $13
sub $15, $5, $2
lw $8, 0($1)
lw $6, 8($3)
nop
nop
add $15, $6, $6
sw $3, 0($5)
lui $6, 197
sw $6, 4($5)
lw $2, 0($4)
sub $13, $13, $12
sub $11, $2, $8
jal func_11
nop
func_11:
add $15, $15, $10
sw $10, 0($2)
sub $14, $11, $12
sw $8, 4($3)
sw $8, 0($4)
jr $31
nop
lui $13, 0
ori $13, $13, 14232
jr $13
nop
beq $1, $3, label_13
nop
label_13:
sub $7, $2, $8
ori $15, $12, 133
ori $10, $7, 187
sub $1, $4, $3
ori $13, $10, 79
add $8, $1, $4
lui $3, 168
add $10, $13, $8
ori $15, $3, 228
lw $3, 8($4)
ori $9, $3, 198
lw $3, 8($1)
lw $2, 0($1)
add $3, $3, $2
sw $3, 8($1)
jal func_12
nop
func_12:
sw $13, 8($2)
ori $13, $9, 36
ori $10, $14, 121
nop
sub $15, $9, $10
jr $31
nop
add $3, $7, $1
ori $9, $12, 19
nop
sub $9, $3, $7
lui $1, 131
ori $14, $9, 21
ori $15, $12, 145
add $13, $1, $5
lw $6, 8($3)
lw $6, 4($3)
add $6, $6, $6
sw $6, 8($3)
nop
lui $8, 203
nop
sw $8, 4($1)
lui $10, 0
ori $10, $10, 14384
jr $10
nop
sub $3, $4, $6
nop
ori $13, $3, 143
lui $4, 184
ori $12, $9, 9
sub $9, $4, $3
lui $9, 0
ori $9, $9, 14376
jr $9
nop
nop
lw $8, 0($3)
nop
ori $10, $12, 99
add $10, $8, $5
add $3, $2, $2
ori $10, $13, 75
sub $8, $3, $2
lw $8, 0($2)
nop
add $10, $8, $8
add $4, $2, $4
sub $10, $8, $9
sub $10, $10, $13
ori $12, $4, 240
lui $4, 55
add $13, $14, $14
sub $10, $4, $2
lw $2, 8($4)
lw $7, 0($4)
add $2, $2, $7
sw $2, 8($4)
ori $1, $8, 246
ori $10, $11, 228
sub $14, $14, $11
sw $1, 8($3)
beq $7, $1, label_14
nop
label_14:
sub $1, $2, $2
nop
sw $1, 0($1)
lw $1, 0($5)
nop
nop
sw $1, 0($5)
lui $9, 0
ori $9, $9, 14624
jr $9
nop
add $7, $2, $1
add $13, $12, $15
ori $8, $8, 21
sub $14, $7, $2
beq $6, $4, label_15
nop
label_15:
beq $7, $6, label_16
nop
label_16:
beq $5, $8, label_17
nop
label_17:
sub $3, $4, $1
ori $13, $12, 155
nop
add $15, $3, $4
lw $2, 0($2)
nop
nop
sw $2, 0($2)
beq $3, $4, label_18
nop
label_18:
add $3, $2, $4
sub $14, $3, $2
ori $4, $5, 56
ori $12, $12, 218
ori $10, $14, 59
sub $10, $4, $5
lw $4, 4($5)
sub $11, $13, $13
sub $8, $4, $5
lw $7, 0($5)
nop
add $12, $7, $6
ori $4, $1, 67
sub $10, $4, $1
lw $3, 0($5)
nop
sub $12, $3, $5
ori $8, $7, 91
sub $14, $11, $12
add $9, $13, $14
ori $8, $8, 43
lui $15, 0
ori $15, $15, 14736
jr $15
nop
lui $4, 254
ori $10, $14, 113
sub $14, $4, $8
ori $5, $8, 234
sub $9, $5, $8
lui $7, 116
nop
ori $10, $12, 5
add $12, $7, $6
sub $6, $5, $8
sw $6, 4($4)
lw $2, 0($5)
lw $1, 4($5)
add $2, $2, $1
sw $2, 0($5)
beq $4, $6, label_19
nop
label_19:
sub $4, $6, $4
add $15, $4, $6
ori $4, $2, 142
sub $14, $4, $2
lw $1, 8($4)
sub $8, $1, $4
lw $8, 0($1)
nop
sw $8, 4($3)
lw $7, 4($5)
sub $15, $9, $14
ori $15, $9, 50
sub $10, $7, $6
nop
lw $8, 0($4)
lw $7, 4($4)
add $8, $8, $7
sw $8, 0($4)
lw $2, 0($5)
beq $6, $8, label_20
nop
label_20:
lw $5, 8($1)
sub $10, $15, $8
sw $5, 0($3)
add $3, $3, $8
sub $15, $3, $3
beq $4, $5, label_21
nop
label_21:
lw $3, 0($4)
sub $7, $5, $3
nop
sw $7, 8($5)
lw $5, 8($2)
lw $8, 8($3)
add $14, $8, $6
ori $3, $1, 178
add $11, $12, $15
ori $8, $13, 108
ori $12, $3, 187
sub $8, $5, $4
ori $10, $12, 1
ori $14, $15, 7
sub $13, $8, $5
lw $8, 0($2)
nop
add $12, $8, $8
lui $3, 123
add $8, $8, $14
sw $3, 0($4)
beq $8, $1, label_22
nop
label_22:
lui $6, 196
add $12, $13, $9
add $9, $15, $12
sw $6, 8($5)
lw $3, 4($5)
lui $14, 0
ori $14, $14, 15060
jr $14
nop
lw $5, 8($4)
ori $15, $8, 26
add $15, $11, $15
add $10, $5, $3
lui $3, 89
sw $3, 0($4)
lw $1, 4($5)
ori $8, $1, 246
lw $8, 4($3)
nop
sub $15, $8, $6
add $7, $2, $2
sw $7, 4($3)
add $7, $1, $1
sub $9, $10, $8
ori $11, $8, 5
add $10, $7, $1
jal func_13
nop
func_13:
add $15, $14, $14
nop
add $12, $8, $9
add $14, $11, $8
jr $31
nop
lw $7, 4($4)
add $8, $7, $4
add $11, $8, $7
nop
beq $3, $5, label_23
nop
label_23:
nop
beq $7, $1, label_24
nop
label_24:
jal func_14
nop
func_14:
add $11, $15, $15
sub $15, $15, $9
ori $15, $12, 7
sub $15, $14, $11
jr $31
nop
lw $7, 4($1)
sw $7, 0($1)
ori $6, $8, 248
sub $15, $8, $10
sub $15, $6, $8
ori $3, $4, 163
add $10, $9, $10
add $10, $3, $4
lui $9, 0
ori $9, $9, 15392
jr $9
nop
lw $5, 4($5)
nop
nop
ori $11, $5, 139
nop
add $2, $3, $1
add $11, $2, $3
beq $7, $4, label_25
nop
label_25:
lui $13, 0
ori $13, $13, 15416
jr $13
nop
add $5, $7, $7
nop
add $9, $5, $7
add $6, $1, $6
nop
add $13, $6, $1
beq $2, $1, label_26
nop
label_26:
ori $6, $5, 229
sub $13, $14, $9
ori $13, $14, 138
sub $12, $6, $5
jal func_15
nop
func_15:
lw $11, 4($5)
sw $10, 8($2)
ori $11, $15, 99
sw $10, 8($2)
sub $14, $13, $8
jr $31
nop
lw $1, 4($1)
lw $1, 8($1)
add $1, $1, $1
sw $1, 4($1)
add $7, $6, $7
sw $7, 4($5)
lui $7, 230
sub $11, $7, $2
sub $8, $7, $5
sub $13, $14, $12
ori $15, $11, 16
sw $8, 8($5)
sub $3, $2, $7
nop
sub $10, $11, $11
add $15, $3, $2
sub $7, $8, $7
sw $7, 8($5)
nop
lw $4, 4($4)
lw $4, 8($4)
add $4, $4, $4
sw $4, 4($4)
sub $8, $5, $6
ori $14, $8, 12
ori $6, $4, 150
nop
nop
sub $9, $6, $4
lui $5, 50
ori $10, $11, 20
sw $5, 4($2)
beq $5, $4, label_27
nop
label_27:
add $4, $8, $6
add $8, $4, $8
add $7, $3, $4
ori $14, $9, 241
ori $14, $14, 178
sub $10, $7, $3
add $5, $2, $2
ori $13, $13, 220
sub $12, $10, $14
sw $5, 0($3)
lw $5, 0($5)
add $9, $8, $15
add $13, $5, $8
add $4, $1, $4
sw $4, 8($3)
lui $1, 129
ori $15, $1, 31
jal func_16
nop
func_16:
add $8, $11, $10
add $15, $10, $10
nop
jr $31
nop
add $2, $5, $2
add $11, $14, $13
add $12, $13, $9
sw $2, 0($2)
beq $2, $2, label_28
nop
label_28:
sub $8, $7, $1
add $12, $8, $7
beq $1, $2, label_29
nop
label_29:
beq $8, $1, label_30
nop
label_30:
jal func_17
nop
func_17:
nop
sw $12, 0($5)
nop
sw $9, 0($4)
sw $8, 4($3)
sw $14, 0($5)
jr $31
nop
lw $8, 4($1)
nop
sw $8, 4($1)
lw $6, 8($5)
sw $6, 8($5)
lui $6, 45
add $10, $10, $9
ori $14, $6, 224
add $1, $6, $2
ori $14, $9, 66
sub $15, $1, $6
lui $5, 239
add $10, $14, $8
add $8, $9, $14
sub $14, $5, $6
ori $2, $3, 239
add $8, $2, $3
sub $7, $3, $4
add $10, $9, $13
sub $12, $9, $12
ori $11, $7, 119
lw $2, 4($5)
lw $7, 8($5)
add $2, $2, $7
sw $2, 4($5)
sub $6, $2, $5
nop
sub $8, $11, $9
sub $10, $6, $2
beq $5, $3, label_31
nop
label_31:
ori $1, $6, 238
nop
add $9, $1, $6
lw $1, 0($5)
ori $13, $1, 150
lw $6, 4($3)
lw $7, 8($3)
add $6, $6, $7
sw $6, 4($3)
lui $3, 12
ori $12, $11, 212
sub $12, $15, $15
sub $9, $3, $2
add $5, $5, $2
add $13, $13, $11
ori $8, $14, 101
sub $13, $5, $5
ori $5, $4, 181
add $14, $11, $14
ori $13, $9, 33
ori $10, $5, 232
lw $5, 8($4)
nop
add $15, $5, $5
lw $3, 8($2)
ori $8, $12, 7
ori $11, $3, 190
lw $6, 0($5)
nop
nop
add $14, $6, $6
lui $5, 3
ori $9, $12, 226
sub $15, $5, $8
beq $4, $8, label_32
nop
label_32:
beq $2, $2, label_33
nop
label_33:
jal func_18
nop
func_18:
ori $13, $10, 192
lw $10, 8($3)
lw $8, 4($5)
sw $13, 4($5)
nop
jr $31
nop
beq $1, $6, label_34
nop
label_34:
add $3, $5, $3
add $13, $13, $13
sw $3, 0($5)
sub $5, $3, $1
nop
sw $5, 0($1)
lw $2, 0($4)
lw $5, 4($4)
add $2, $2, $5
sw $2, 0($4)
ori $5, $4, 217
sub $13, $5, $4
ori $6, $3, 27
nop
ori $9, $6, 239
end_loop:
nop
beq $0, $0, end_loop
nop
```

### 思考题9

> &#91;P5、P6 选做&#93; 请评估我们给出的覆盖率分析模型的合理性，如有更好的方案，可一并提出。

将于P6完成。
