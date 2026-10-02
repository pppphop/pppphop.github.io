---
title: "P4课下-Verilog单周期CPU"
date: "2025-11-04 17:03:02"
updated: "2026-01-21 17:54:39"
categories:
  - "CO课下"
tags:
  - "CO"
  - "CO课下"
permalink: "posts/P4课下-Verilog单周期CPU/"
---
# CO设计文档—Verilog单周期CPU

## 笔者的话

P4其实和P3类似，不过将P3翻译为Verilog语言，也是对Verilog写出综合性代码的熟悉。从P4开始，课下的详细搭法推荐lmhgg的博客：[Kamonto’s Little Planet](https://kamonto.github.io/Kamonto_blog/)，上面讲的非常详细，远比教程好使。越往后教程会越粗糙，到P7教程几乎无法给你任何搭建上的思路，看博客是必要的。大部分同学的博客（包括我的），课下部分都是设计文档直接照搬，一般意义不大，课上部分往往是真题回忆和解题思路等，这些对于上机是极其有用的。

## CPU设计方案综述

### 总体设计概述

整体架构图参考：

![](/posts/P4%E8%AF%BE%E4%B8%8B-Verilog%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E8%AE%BE%E8%AE%A1%E5%9B%BE.png)

### 设计需求

- 处理器为 32 位单周期处理器，应支持的指令集为：<strong>add, sub, ori, lw, sw, beq, lui，jal，jr，nop</strong>

 ，其中：
  - `nop` 为空指令，机器码 `0x00000000`，不进行任何有效行为（修改寄存器等）。
  - `add, sub` 按无符号加减法处理（不考虑溢出）。
- 需要采用<strong>模块化</strong>和<strong>层次化</strong>设计。顶层有效的驱动信号要求包括且仅包括<strong>异步复位信号 reset</strong>（$clk$ 使用内置时钟模块）。

### 关键模块定义

#### 1.IFU（取址单元）

<strong>端口说明</strong>

信号名称 方向 功能描述     clk 输入 时钟信号   reset 输入 异步复位信号   NPC 输入 输入NPC   PC 输出 输出当前指令地址   Instr 输出 输出当前指令码

内含指令储存器IM，将PC中储存的对应地址的指令取出。

- 用 ROM 实现，容量为 4096 × 32bit。
- <strong>起始地址：0x00003000。</strong>
- 地址范围：0x00003000 &#126; 0x00006FFF。
- ROM 内部的起始地址是从 0 开始的，即 ROM 的 0 位置存储的是 PC 为 0x00003000 的指令，每条指令是一个 32bit 常数。
- 经过以上分析，不难发现 ROM 实际地址宽度仅需 $16$ 位，但是<strong>传入的PC地址</strong>是<strong>32位</strong>的，那么我们应该取`PC[17:2]`接入ROM的输入端
- ![](/posts/P4%E8%AF%BE%E4%B8%8B-Verilog%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162645-1762473993856-1.png)

#### 2.NPC（次地址计算单元）

<strong>端口说明</strong>

信号名称 方向 功能描述     PC&#91;31:0&#93; 输入 32位输入当前地址   Instr&#91;31:0&#93; 输入 当前指令   NPC&#91;31:0&#93; 输出 32位输出次地址   NPCOp&#91;1:0&#93; 输入 控制信号   Rs&#91;31:0&#93; 输入 `$ra`寄存器保存的32位地址   Zero 输入 `$rs`与`$rt`是否相等的标志；1：相等；0：不等   PC+4&#91;31:0&#93; 输出 输出PC+4的值

##### 控制信号说明

控制信号值 功能     `3'b000` `NPC=PC+4`   `3'b001` 执行`beq`指令   `3'b110` 执行`j`，`jal`指令   `3'b111` 执行`jalr`，`jr`指令

![](/posts/P4%E8%AF%BE%E4%B8%8B-Verilog%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162405.png)

#### 3.GRF（寄存器堆）

<strong>端口说明</strong>

信号名称 方向 功能描述     A1&#91;4:0&#93; 输入 5位地址输入信号，将其储存的数据读出到RD1   A2&#91;4:0&#93; 输入 5位地址输入信号，将其储存的数据读出到RD2   A3&#91;4:0&#93; 输入 5位地址输入信号，将其作为写入数据的目标寄存器   RD1&#91;31:0&#93; 输出 输出A1指定的寄存器中的32位数据   RD2&#91;31:0&#93; 输出 输出A2指定的寄存器中的32位数据   WD&#91;31:0&#93; 输入 32位数据输入信号   WE 输入 写使能信号；1：写入有效；0：写入无效   clk 输入 时钟信号   reset 输入 异步复位信号，将32个寄存器中的数据清零；1：复位；0：无效

##### 控制信号说明

<strong>1. WRA3Sel</strong>

控制信号值 功能     `2'b00` 选择待写入寄存器地址来自`Instr[20:16]`   `2'b01` 选择待写入寄存器地址来自`Instr[15:11]`   `2'b10` 选择写入寄存器的地址为31(`$ra`)

<strong>2. WDSel</strong>

控制信号值 功能     `2'b00` 选择写入寄存器的数据来自ALU   `2'b01` 选择写入寄存器的数据来自DM运算结果   `2'b10` 选择写入寄存器的数据为PC+4

#### 4.EXT（位扩展）

将16位二进制数进行零扩展或符号扩展到32位

<strong>控制信号说明</strong>

控制信号值 功能     `1'b0` 零扩展   `1'b1` 符号扩展

![](/posts/P4%E8%AF%BE%E4%B8%8B-Verilog%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162755.png)

#### 5.ALU（算术逻辑单元）

<strong>端口说明</strong>

信号名称 方向 功能描述     A&#91;31:0&#93; 输入 32位输入运算数A   B&#91;31:0&#93; 输入 32位输入运算数B   C&#91;31:0&#93; 输出 32位输出运算结果   ALUOp&#91;3:0&#93; 输入 控制信号   Zero 输出 若$A-B=0$则置为1，否则置为0   LessZero 输出 若$A&#60;B$则置为1，否则置为0

<strong>控制信号说明</strong>

<strong>1. ALUOp</strong>

控制信号值 功能     `3'b000` 执行加法运算   `3'b001` 执行减法运算   `3'b010` 执行逻辑与运算   `3'b011` 执行逻辑或运算   `3'b100` 执行`lui`指令

<strong>2. ALUBSel</strong>

控制信号值 功能     `1'b0` 选择寄存器中的值进行运算   `1'b1` 选择立即数进行运算

<strong>3. ALUASel</strong>

控制信号值 功能     `1'b0` 选择寄存器中的值进行运算   `1'b1` 选择`sll`指令中移位的位数

![](/posts/P4%E8%AF%BE%E4%B8%8B-Verilog%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20162833.png)

#### 6.DM（数据储存器）

<strong>端口说明</strong>

信号名称 方向 功能描述     Addr&#91;31:0&#93; 输入 待操作的内存地址   WD&#91;31:0&#93; 输入 待写入内存的值   clk 输入 时钟信号   reset 输入 异步复位信号   DMWr 输入 写使能信号；1：写入有效；0：写入无效   DMOp 输入 控制信号   RD&#91;31:0&#93; 输出 输入地址指向的内存中储存的值

<strong>控制信号说明</strong>

控制信号值 功能     `2'b00` 对应`lw`和`sw`指令，写入或读取整个字   `2'b01` （保留）对应`lh`和`sh`指令，写入或读取半字   `2'b10` （保留）对应`lb`和`sb`指令，写入或读取整个字

也许对于`lbu`指令还需要添加额外的控制信号

![](/posts/P4%E8%AF%BE%E4%B8%8B-Verilog%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20163108.png)

### 7.Control-控制模块

指令 opcode funct NPCOp WRA3Sel WDSel EXTOp WE ALUASel ALUBSel ALUOp DMWr DMOp     <strong>add</strong> 000000 100000 000 01 00 X 1 0 0 000 0 X   <strong>sub</strong> 000000 100010 000 01 00 X 1 0 0 001 0 X   <strong>ori</strong> 001101  000 00 00 0 1 0 1 011 0 X   <strong>lw</strong> 100011  000 00 01 1 1 0 1 000 0 00   <strong>sw</strong> 101011  000 00 01 1 0 0 1 000 1 00   <strong>beq</strong> 000100  001 X X 1 0 0 0 001 0 X   <strong>lui</strong> 001111  000 00 00 X 1 0 1 100 0 X   <strong>jal</strong> 000011  110 10 10 0 1 0 0 0 0 0   <strong>jr</strong> 000000 001000 111 00 00 0 0 0 0 0 0 0

### 8.Top-数据通路

取址 访存 计算 存储 写回     $add$ $PC+4$ $读出rs$,$rt字段对应的寄存器的值到RD1,RD2$ $RD1 +RD2 \=ALUans=DMaddr$ $\textbackslash\DMwr=0$ $A3=rd\WD=ALUans$   $sub$ $PC+4$ $读出rs,rt字段对应的寄存器的值到RD1,RD2$ $RD1 - RD2\=ALUans=DMaddr$ $\textbackslash\DMwr=0$ $A3=rd\WD=ALUans$   $ori$ $PC+4$ $读出rs字段对应的寄存器的值到RD1, \ 立即数零扩展$ $RD1 &#126; &#126; (zero)imm32\=ALUans=DMaddr$ $\textbackslash\DMwr=0$ $A3=rt\WD=ALUans$   $lw$ $PC+4$ $读出rs字段对应的寄存器的值到RD1, \ 立即数符号扩展$ $RD1+(signed)imm32 \=ALUans=DMaddr$ $\textbackslash\DMwr=0$ $A3=rt\WD=DMrd$   $sw$ $PC+4$ $读出rs,rt字段对应的寄存器的值到RD1,RD2 \ 立即数符号扩展$ $RD1+(signed)imm32 \=ALUans=DMaddr$ $DMWD=RD2\(=grf&#91;rt&#93;)$ $\textbackslash\GRFwe=0$   $beq$ $zero=1时:\PC+4+(sign)imm32\zero=0时:PC+4$ $读出rs,rt字段对应的寄存器的值到RD1,RD2 \ 立即数符号扩展$ $zero=\(RD1-RD2==0)$ $\textbackslash\DMwr=0$ $\textbackslash\GRFwe=0$   $lui$ $PC+4$ $立即数零扩展$ $imm32&#60;&#60;16 \=ALUans=DMaddr$ $\textbackslash\DMwr=0$ $A3=rt\WD=ALUans$   $nop$ $PC+4$ $\textbackslash$ $\textbackslash$ $\textbackslash\DMwr=0$ $\textbackslash\GRFwe=0$   $jal$ ${PC&#91;31:28&#93;,Instr&#91;25:0&#93;,2’b00}$ $\textbackslash$ $\textbackslash$ $\textbackslash\DMwr=0$ $A3=1f\WD=PC+4$   $jr$ $grf&#91;rs&#93;$ $读出rs字段对应的寄存器的值到RD1$ $\textbackslash$ $\textbackslash\DMwr=0$ $\textbackslash\GRFwe=0$

![](/posts/P4%E8%AF%BE%E4%B8%8B-Verilog%E5%8D%95%E5%91%A8%E6%9C%9FCPU/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202025-11-01%20163224.png)

## 测试方案

本次我没有实现一个完整的全自动的评测机，但是实现了半自动的代码生成与对比，仍需手动进行一些操作。

首先是MIPS汇编代码生成：

```
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

unsigned int grf[32];
int reg[] = {0, 1, 2, 3, 31};
int dm[1024];
#define R reg[rand() % 5]
#define I (rand() + rand())
#define B (rand() % 650)

void add(int rs, int rt, int rd)
{
    printf("add $%d,$%d,$%d\n", rd, rt, rs);
    if (rd)
        grf[rd] = grf[rs] + grf[rt];
}

void sub(int rs, int rt, int rd)
{
    printf("sub $%d,$%d,$%d\n", rd, rt, rs);
    if (rd)
        grf[rd] = grf[rs] - grf[rt];
}

void ori(int rs, int rt, int imm)
{
    printf("ori $%d,$%d,%d\n", rt, rs, imm);
    if (rt)
        grf[rt] = grf[rs] | imm;
}

void lui(int rs, int rt, int imm)
{
    printf("lui $%d,%d\n", rs, imm);
    if (rs)
        grf[rs] = (unsigned int)imm << 16;
}

void lw(int rs, int rt)
{
    int imm = rand() % 1024 * 4;
    printf("lw $%d,%d($0)\n", rt, imm);
    grf[rt] = dm[imm / 4];
}

void sw(int rs, int rt)
{
    int imm = rand() % 1024 * 4;
    printf("sw $%d,%d($0)\n", rt, imm);
    dm[imm / 4] = grf[rt];
}

int jump[1010];

void beq(int rs, int rt)
{
    int jaddr = B;
    while (jump[jaddr])
        jaddr = B;
    printf("beq $%d,$%d,label%d\n", rs, rt, jaddr);
}

void jal()
{
    int jaddr = B;
    while (jump[jaddr])
        jaddr = B;
    printf("jal label%d\n", jaddr);
}

int jr(int rs, int rt)
{
    int i;
    int can[5];  // 替代vector的数组
    int can_count = 0;  // 数组中有效元素的数量
    
    for (i = 0; i < 5; i++) {
        if (reg[i] > 0x3000 && reg[i] <= 0x3700) {
            can[can_count] = reg[i];
            can_count++;
        }
    }
    
    if (can_count == 0) {
        beq(rs, rt);
        return 0;
    }
    
    rs = can[rand() % can_count];
    printf("jr $%d\n", rs);
    return 1;
}

void nop()
{
    printf("nop\n");
}

int main()
{
    int i;
    srand(time(NULL));
    freopen("mips_code.txt", "w", stdout);
    printf("sub $31,$31,$31\n");
    
    memset(grf, 0, sizeof(grf));
    memset(dm, 0, sizeof(dm));
    memset(jump, 0, sizeof(jump));
    
    int last = -1;
    for (i = 0; i < 1000; i++)
    {
        printf("label%d: ", i);
        int instr = rand() % 10; 
        
        while ((i < 300 || last == 1) && instr >= 6 && instr <= 8)
        { 
            instr = rand() % 10; 
        }
        
        int rs = R, rt = R, rd = R, imm = I;
        
        if (instr == 0)
            add(rs, rt, rd);
        else if (instr == 1)
            sub(rs, rt, rd);
        else if (instr == 2)
            ori(rs, rt, imm);
        else if (instr == 3)
            lui(rs, 0, imm);
        else if (instr == 4)
            lw(rs, rt);
        else if (instr == 5)
            sw(rs, rt);
        else if (instr == 6)
            beq(rs, rt);
        else if (instr == 7) 
            jal();
        else if (instr == 8) 
        {
            int yes = jr(rs, rt);
            if (!yes)
                instr = 6; //beq
        }
        else
            nop();
            
        jump[i] = last = (instr >= 6 && instr <= 8); 
    }
    
    printf("label:\n beq $0,$0,label\nnop");
    return 0;
}
```

这时，如果直接将结果导入MARS，会发现`add`指令出现溢出报错，这是因为我们实现的`add`是不处理溢出的。所以需要一段字符串匹配代码将`add`全部替换为`addu`注入魔改MARS：

```
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_LINE_LENGTH 1024

// 函数：替换字符串中的子串
char* replace_substring(const char* str, const char* old, const char* news) {
    char* result;
    int i, count = 0;
    int new_len = strlen(news);
    int old_len = strlen(old);
    
    // 计算需要替换的次数
    for (i = 0; str[i] != '\0'; i++) {
        if (strstr(&str[i], old) == &str[i]) {
            count++;
            i += old_len - 1; // 跳过已匹配的部分
        }
    }
    
    // 分配新字符串的内存
    result = (char*)malloc(i + count * (new_len - old_len) + 1);
    
    i = 0;
    while (*str) {
        // 检查是否找到要替换的子串
        if (strstr(str, old) == str) {
            strcpy(&result[i], news);
            i += new_len;
            str += old_len;
        } else {
            result[i++] = *str++;
        }
    }
    
    result[i] = '\0';
    return result;
}

int main() {
    FILE *input_file, *output_file;
    char line[MAX_LINE_LENGTH];
    char *modified_line;
    
    // 打开输入文件
    input_file = fopen("mips_code.txt", "r");
    if (input_file == NULL) {
        printf("错误：无法打开输入文件 mips_code.txt\n");
        return 1;
    }
    
    // 打开输出文件
    output_file = fopen("mars_code.txt", "w");
    if (output_file == NULL) {
        printf("错误：无法创建输出文件 mars_code.txt\n");
        fclose(input_file);
        return 1;
    }
    
    printf("正在处理文件...\n");
    
    // 逐行读取输入文件
    while (fgets(line, sizeof(line), input_file) != NULL) {
        // 替换 "add" 为 "addu"
        modified_line = replace_substring(line, "add", "addu");
        
        // 写入输出文件
        fputs(modified_line, output_file);
        
        // 释放内存
        free(modified_line);
    }
    
    // 关闭文件
    fclose(input_file);
    fclose(output_file);
    
    printf("处理完成！结果已保存到 mars_code.txt\n");
    
    return 0;
}
```

我们将第一段代码的文件放入MARS汇编后将二进制码`Dump to file`，让自己的Verilog单周期CPU读入处理，将第二段代码的文件注入魔改MARS运行得到输出日志，使用下方C++对比代码进行文件对比即可。

```
#include <iostream>
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <ctime>
#include <cstring>
using namespace std;

const int MAXN = 10005;

char std_ans[MAXN][40];
char src_ans[MAXN][40];
int std_ans_len = 0, src_ans_len = 0;

void comp() {
    if(std_ans_len != src_ans_len) {
        cout << "Failed at answer length!" << "\n";
        system("pause");
        return;
    }
    bool t = false;
    for(int i = 3; i < std_ans_len; i++) {
        if(strcmp(std_ans[i], src_ans[i]) != 0) {
        	t = true;
        	cout << "Failed at line " << i << endl;
			printf("Your output is ");fputs(src_ans[i], stdout);
			printf("The standard output is ");fputs(std_ans[i], stdout);
			system("pause");
		}
    }
    if(!t) cout << "Passed!" << "\n";
    //system("pause");
}

int main() {
    int s = 0;
    FILE *std, *src;
    std = fopen("std_out.txt", "r");
    src = fopen("src_out.txt", "r");
    char *temp;
    while(fgets(std_ans[std_ans_len++], 39, std));
    while(fgets(src_ans[src_ans_len++], 39, src));
    comp();
    return 0;
}
```

这样可以实现半自动化的对比。但是，这样的测评仍有缺陷，完全的随机导致难以测到边界条件，以及难以用`sw`读出已经进行了`lw`的内存地址，导致总是读出$0$，测试效果不佳。我们可以自行使用魔改MARS写一些边界情形、`lw`，`sw`的专门测试等。比如：

```
ori $t1,$t1,1
sw $t1,0($t0)
ori $t0,$t0,4
ori $t2,$t2,2
lui $t1,0x1234
sw $t1,0($t0)
ori $t1,$t1,2
add $t0,$t0,$t0
sw $t1,0($t0)
lw $s0,-8($t0)
lw $s1,-4($t0)
lw $t2,0($s2)
lui $t3,0xffff
ori $t3,$t3,0xffff
ori $t4,$t4,1
add $t5,$t4,$t3
```

## 思考题

### 思考题1

> 阅读下面给出的 DM 的输入示例中（示例 DM 容量为 4KB，即 32bit × 1024字），根据你的理解回答，这个 addr 信号又是从哪里来的？地址信号 addr 位数为什么是 &#91;11:2&#93; 而不是 &#91;9:0&#93; ？

### 解答

$addr$信号是从$ALU$的计算结果`ALUans`来的；DM 的寻址方式是基于<strong>字寻址</strong>而非字节寻址，相当于把$addr$信号左移两位。

### 思考题2

> 思考上述两种控制器设计的译码方式，给出代码示例，并尝试对比各方式的优劣。

### 解答

“两种方式”指的是直接译码和查表法。即指令$\rightarrow$控制信号与控制信号$\rightarrow$指令的区别。

<strong>方式一：指令 -&#62; 控制信号（正向译码）</strong>：

<strong>思路</strong>：根据指令的操作码，分别生成每条所有控制信号的值。

```
`timescale 1ns / 1ps
module CTRL(
    input [31:0] Instr,
    output reg [2:0] NPCop,
    output reg [1:0] A3slt,
    output reg [1:0] WDslt,
    output reg GRFwe,
    output reg EXTop,
    output reg ALUAslt,
    output reg ALUBslt,
    output reg [2:0] ALUop,
    output reg DMWr
    );
	 
parameter R=6'b000000;
parameter add=6'b100000;
parameter sub=6'b100010;
parameter jr=6'b001000;
parameter ori=6'b001101;
parameter lw=6'b100011;
parameter sw=6'b101011;
parameter beq=6'b000100;
parameter lui=6'b001111;
parameter jal=6'b000011;

wire [5:0] opcode,funct;
assign opcode=Instr[31:26];
assign funct=Instr[5:0];
always @(*) begin
	case (opcode)
		R: begin
		case (funct)
			add: begin
				NPCop=3'b000;
				A3slt=1;				//11-15
				WDslt=0;				//ALUans
				GRFwe=1;
				EXTop=0;
				ALUAslt=0;
				ALUBslt=0;
				ALUop=3'b000;
				DMWr=0;
			end
			sub: begin
				NPCop=3'b000;
				A3slt=1;				//11-15
				WDslt=0;				//ALUans
				GRFwe=1;
				EXTop=0;
				ALUAslt=0;
				ALUBslt=0;
				ALUop=3'b001;
				DMWr=0;				
			end
			jr: begin
				NPCop=3'b111;
				A3slt=0;				//x
				WDslt=0;				//x
				GRFwe=0;
				EXTop=0;
				ALUAslt=0;
				ALUBslt=0;
				ALUop=3'b000;
				DMWr=0;				
			end
			default: begin			//nop
				NPCop=3'b000;
				A3slt=0;				//x
				WDslt=0;				//x
				GRFwe=0;
				EXTop=0;
				ALUAslt=0;
				ALUBslt=0;
				ALUop=3'b000;
				DMWr=0;					
			end
			endcase
		end
		ori: begin
				NPCop=3'b000;
				A3slt=0;				//16-20 rt
				WDslt=0;				//ALUans
				GRFwe=1;
				EXTop=0;
				ALUAslt=0;
				ALUBslt=1;
				ALUop=3'b011;
				DMWr=0;					
		end
		lw: begin
				NPCop=3'b000;
				A3slt=0;				//16-20 rt
				WDslt=1;				//DMrd
				GRFwe=1;
				EXTop=1;
				ALUAslt=0;
				ALUBslt=1;
				ALUop=3'b000;
				DMWr=0;				
		end
		sw: begin
				NPCop=3'b000;
				A3slt=0;				//x
				WDslt=0;				//x
				GRFwe=0;
				EXTop=1;
				ALUAslt=0;
				ALUBslt=1;
				ALUop=3'b000;
				DMWr=1;				
		end
		beq: begin
				NPCop=3'b001;
				A3slt=0;				//x
				WDslt=0;				//x
				GRFwe=0;
				EXTop=1;
				ALUAslt=0;
				ALUBslt=0;
				ALUop=3'b001;
				DMWr=0;				
		end	
		lui: begin
				NPCop=3'b000;
				A3slt=0;				//16-20 rt
				WDslt=0;				//ALUans
				GRFwe=1;
				EXTop=0;
				ALUAslt=0;
				ALUBslt=1;
				ALUop=3'b100;
				DMWr=0;				
		end	
		jal: begin
				NPCop=3'b110;
				A3slt=2'b10;				//1f
				WDslt=2'b10;				//PC+4
				GRFwe=1;
				EXTop=0;
				ALUAslt=0;
				ALUBslt=0;
				ALUop=3'b000;
				DMWr=0;				
		end		
		default: begin			
			NPCop=3'b000;
			A3slt=0;				//x
			WDslt=0;				//x
			GRFwe=0;
			EXTop=0;
			ALUAslt=0;
			ALUBslt=0;
			ALUop=3'b000;
			DMWr=0;					
		end
	endcase
end
endmodule
```

本人正是使用这种方法。

<strong>方式二：控制信号 -&#62; 指令（反向查表）</strong>

<strong>思路</strong>：预先定义好控制信号的组合模式，根据指令查找对应的模式。

```
//...
assign EXTop=(lw | sw | beq) ? 1:0
//...
```

上面给出一个示例，这种写起来会简洁一些，但思路并未简单，感觉更容易出错。

#### 方式一优势：

1. <strong>直观易懂</strong>：逻辑流程清晰，易于理解和调试
2. <strong>灵活性高</strong>：可以方便地添加条件判断和特殊处理
3. <strong>资源优化</strong>：综合器可能更好地优化逻辑表达式
4. <strong>适合初学者</strong>：思维模式直接，符合设计直觉

#### 方式一劣势：

1. <strong>维护困难</strong>：指令增多时代码变得冗长
2. <strong>容易出错</strong>：手动设置每个信号容易遗漏
3. <strong>扩展性差</strong>：添加新指令需要修改整个case结构

#### 方式二优势：

1. <strong>模块化强</strong>：控制信号模式可复用
2. <strong>易于维护</strong>：添加新指令只需定义新模式
3. <strong>代码整洁</strong>：结构清晰，便于团队协作
4. <strong>可读性好</strong>：信号模式有明确的命名

#### 方式二劣势：

1. <strong>初始设置复杂</strong>：需要预先定义所有模式
2. <strong>灵活性受限</strong>：特殊处理需要额外逻辑
3. <strong>可能冗余</strong>：对于简单控制器略显繁琐

### 思考题3

> 在相应的部件中，复位信号的设计都是<strong>同步复位</strong>，这与 P3 中的设计要求不同。请对比<strong>同步复位</strong>与<strong>异步复位</strong>这两种方式的 reset 信号与 clk 信号优先级的关系。

### 解答

- <strong>同步复位</strong>：<strong>`clk` 信号的优先级高于 `reset` 信号</strong>。复位信号必须等到时钟的有效边沿到来时，才会被采样并执行复位操作
- <strong>异步复位</strong>：<strong>`reset` 信号的优先级高于 `clk` 信号</strong>。只要复位信号有效，立即进行复位，与时钟边沿无关。

​ 同步复位有延迟、异步复位易受毛刺影响。

### 思考题4

> C 语言是一种弱类型程序设计语言。C 语言中不对计算结果溢出进行处理，这意味着 C 语言要求程序员必须很清楚计算结果是否会导致溢出。因此，如果仅仅支持 C 语言，MIPS 指令的所有计算指令均可以忽略溢出。 请说明为什么在忽略溢出的前提下，addi 与 addiu 是等价的，add 与 addu 是等价的。提示：阅读[《MIPS32® Architecture For Programmers Volume II: The MIPS32® Instruction Set》](http://cscore.buaa.edu.cn/assets/cscore-assets/MIPS_Vol2_指令集_.pdf)中相关指令的 Operation 部分（详见文档 page 34、page 35）。

### 解答

在 MIPS 指令集中，`addi` 和 `addiu` 以及 `add` 和 `addu` 指令在功能上的主要区别在于是否对计算结果进行溢出检查。如果忽略溢出，这些指令在计算结果上是等价的。原因如下：

- <strong>`addi` 指令（Add Immediate）</strong>：  
根据文档第 34 页，`addi` 指令的操作如下：
  - 计算临时值 `temp = GPR[rs] + sign_extend(immediate)`。
  - 如果 `temp` 溢出（即计算结果超出了 32 位有符号整数的范围），则触发整数溢出异常（Integer Overflow Exception）。
  - 如果没有溢出，则将 `temp` 写入目标寄存器 `GPR[rt]`。
- <strong>`addiu` 指令（Add Immediate Unsigned）</strong>：  
根据文档第 35 页，`addiu` 指令的操作如下：
  - 计算临时值 `temp = GPR[rs] + sign_extend(immediate)`。
  - 直接将 `temp` 写入目标寄存器 `GPR[rt]`，不进行溢出检查。

在忽略溢出的前提下，`addi` 和 `addiu` 都执行相同的加法操作：将寄存器 `rs` 的值与符号扩展的立即数相加，并将结果写入寄存器 `rt`。由于溢出检查被忽略，`addi` 不会触发异常，因此两者产生的计算结果完全相同。值得注意的是，`addiu` 中的 “Unsigned” 名称有些误导，因为它实际上使用符号扩展的立即数，操作本身与 `addi` 在二进制级别是一致的。

- <strong>`add` 指令（Add）</strong>：  
根据文档第 34 页，`add` 指令的操作如下：
  - 计算临时值 `temp = GPR[rs] + GPR[rt]`。
  - 如果 `temp` 溢出（即计算结果超出了 32 位有符号整数的范围），则触发整数溢出异常。
  - 如果没有溢出，则将 `temp` 写入目标寄存器 `GPR[rd]`。
- <strong>`addu` 指令（Add Unsigned）</strong>：  
根据文档第 35 页，`addu` 指令的操作如下：
  - 计算临时值 `temp = GPR[rs] + GPR[rt]`。
  - 直接将 `temp` 写入目标寄存器 `GPR[rd]`，不进行溢出检查。

在忽略溢出的前提下，`add` 和 `addu` 都执行相同的加法操作：将寄存器 `rs` 和 `rt` 的值相加，并将结果写入寄存器 `rd`。由于溢出检查被忽略，`add` 不会触发异常，因此两者产生的计算结果完全相同。同样，`addu` 的 “Unsigned” 名称并不改变加法操作的本质，在二进制级别，加法器对有符号和无符号数的处理是相同的。
