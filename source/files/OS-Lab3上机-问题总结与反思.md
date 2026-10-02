# Lab3上机-问题总结与反思

## 写在前面

这篇博客延续之前 P0 / Lab2 的写法，先整理题面，再记录自己的实现思路和反思。Lab3 这次比较特殊：上机安排在 OS 期中的晚上，白天刚考完试，晚上继续上机，准备时间很紧张，所以现场的状态其实并不好。

最终 Exam 部分还能复盘出比较完整的思路，但 Extra 我没有做出来。这篇也就不装作当时很顺利了，主要记录我对 Exam 的理解，以及后来回头看 Extra 时发现自己卡住的原因。

## 题面复原

以下为 Lab3 Exam 与 Extra 的题目原文整理。

### 1. Lab3 Exam：SRTF 调度

#### 准备工作：创建并切换到 `lab3-exam-off` 分支

请在**自动初始化分支后**，在开发机上依次执行以下命令：

```
$ cd ~/学号
$ git fetch
$ git checkout lab3-exam-off
```

初始化的 `lab3-exam-off` 分支基于课下完成的 `lab3` 分支，并且在 `tests` 目录下添加了 `lab3_SRTF` 样例测试目录。

#### 题目描述

课下我们在 MOS 系统中实现了时间片轮转算法（Round-Robin，RR）用于进程调度。在本题中，我们将实现抢占式短作业优先（Shortest Remaining Time First, SRTF），用于调度特定任务进程。

#### 题目要求

在本题中，你需要实现函数 `env_create_srtf` 用于创建 SRTF 调度进程，并返回指向被创建进程的进程控制块的指针。该函数声明如下：

```
struct Env *env_create_srtf(const void *binary, size_t size, int runtime);
```

其中，参数 `binary`、`size` 与 `env_create` 函数中的定义相同，`runtime` 为 SRTF 调度参数，以时间片为单位：`runtime` 表示进程总共需要运行的时间片数量。

在本题中，我们将 MOS 系统两次时钟中断之间的间隔定义为一个时间片。

对于每个使用 `env_create_srtf` 创建的进程，你需要使用 SRTF 算法来进行调度（详见调度规则和示例）。

##### 调度规则

1. 新增的 SRTF 算法与 MOS 原有的 RR 算法拥有**各自独立**的调度队列。SRTF 调度队列中包含所有使用 `env_create_srtf` 创建的进程，而 RR 调度队列（MOS 原有的调度队列）中包含所有使用 `env_create` 创建的进程。
2. 当时钟中断产生时，若 SRTF 调度队列中存在尚未运行完所需时间片（`runtime`）的进程，则选取其中**剩余运行时间最少**的进程调度。如果多个进程的剩余运行时间相同，则选择 `env_id` **最小**的进程调度。
3. 从 SRTF 调度队列选取进程后，你仅需使其**运行一个时间片**，并在下个时钟中断产生时根据第二条规则，重新选择进程调度。本题中要实现的 SRTF 调度算法不受 `yield` 参数和进程优先级的影响，只与进程的**剩余运行时间**有关。
4. 如果 SRTF 调度队列为空，或其中的所有进程均已运行完所需的时间片（即剩余运行时间为 0），则使用课下实现的 RR 算法调度 RR 调度队列中的进程。需要注意的是，SRTF 调度的进程可以在**任何时刻**抢占 RR 调度的进程，且 RR 调度的进程运行的时间片在被 SRTF 抢占后**不发生变化**。例如，如果 RR 算法选择调度一个优先级为 5 的进程 A，并已经使其运行了 3 个时间片，此时 SRTF 队列中产生了可以被调度的进程 B，则进程 B 会抢占进程 A 的运行，直至进程 B 及其它 SRTF 进程运行完毕，SRTF 队列为空或所有进程均结束，进程 A 继续运行剩余的 2 个时间片。

##### 示例

以下示例展示：SRTF 进程中途抢占 RR 进程，以及 SRTF 全部结束后恢复 RR 调度。

| 进程名 | 类型 | 优先级 | Runtime | 创建时机            |
| ------ | ---- | ------ | ------- | ------------------- |
| A      | RR   | 5      | -       | 初始创建            |
| B      | RR   | 1      | -       | 初始创建            |
| C      | SRTF | -      | 2       | 第 3 个时间片后创建 |

初始时只有 RR 队列，且当前正在运行 A。

- **第 0-2 个时间片**：SRTF 队列为空，按 RR 调度 A。A 已运行 3 个时间片，还剩 2 个 RR 时间片。
- **第 3 个时间片后**：创建 SRTF 进程 C（runtime=2）。
- **第 4 个时间片**：到达下一次调度点，C 抢占 A。C 剩余时间 2 -> 1。
- **第 5 个时间片**：继续调度 C。C 剩余时间 1 -> 0，C 运行完毕并移出 SRTF 调度队列。
- **第 6 个时间片及以后**：SRTF 队列再次为空，恢复 RR 调度。A 继续运行其剩余的 2 个时间片（不会重置为 5）；A 用完后再按 RR 规则调度 B。

#### 参考实现思路

本参考实现基于`LIST`结构，你也可以采取 `TAILQ` 结构来实现，满足题目要求即可。

本题参考实现思路如下，你也可以采取其它思路，满足题目要求即可。

1. 在 `include/env.h` 中添加以下声明：

```
LIST_HEAD(Env_srtf_sched_list, Env);

extern struct Env_srtf_sched_list env_srtf_sched_list; // SRTF 调度队列

struct Env *env_create_srtf(const void *binary, size_t size, int runtime);
```

1. 在 `kern/env.c` 中添加 `env_srtf_sched_list` 的定义，**并在** `env_init` **函数中初始化** `env_srtf_sched_list`。

```
struct Env_srtf_sched_list env_srtf_sched_list; // SRTF 调度队列
```

1. 在 `include/env.h` 的 `Env` 结构体中添加以下字段：

```
	LIST_ENTRY(Env) env_srtf_sched_link; // 构造 env_srtf_sched_list 的链表项
	u_int env_total_runtime; // SRTF 调度参数：进程总共需要运行的时间片
	u_int env_runtime_left; // 进程剩余需要运行的时间片
```

1. 在 `kern/env.c` 中仿照 `env_create` 实现 `env_create_srtf` 函数，其中需要初始化进程控制块的相关字段，参考如下：

```
struct Env *env_create_srtf(const void *binary, size_t size, int runtime) {
	...
	// 分配 env 并初始化
	// ...
	// 处理新增的字段
	return e;
}
```

1. 修改 `kern/sched.c` 中的 `schedule` 函数，实现 SRTF 调度算法。

```
   void schedule(int yield) {
	/*
    可能的实现思路：
     如果SRTF调度队列中存在尚未运行完所需时间片的进程，则遍历 SRTF 调度队列，选取剩余时间片最少的进程进行调度（如果有多个剩余时间片相同，则选取 env_id 最小的进程）。
     如果找到这样的进程，将其剩余时间片减 1，并调用 `env_run` 调度该进程。
     如果此进程剩余时间片为0，则将其从 SRTF 调度队列中移除。
    如果 SRTF 调度队列为空或所有进程的剩余时间片为 0，则使用 RR 调度算法调度 RR 调度队列中的进程。
    */
	static int count = 0; // remaining time slices of current env
	struct Env *e = curenv; // 请根据提示修改这行代码

	/* 请将 Exercise 3.12 中的代码粘贴至此 */
}
```

#### 提示

1. 你可以使用 `LIST_FOREACH` 宏遍历队列。
2. 为了保证 RR 调度的连续性，当 SRTF 抢占结束后，RR 算法应该从上次被抢占的地方继续运行。可能需要一个静态变量 `struct Env *last_rr_env` 来记录上一次 RR 调度的进程。
   `static` 变量在程序运行期间仅在第一次遇到时初始化一次，且函数被多次调用时不会重新初始化该变量，因此适合作为跨调用保存状态（例如记录上一次被 RR 调度的进程）。

#### 评测说明

- 测试程序将调用 `env_create` 和 `env_create_srtf` 创建一批进程。
- `env_free` 不会被测试。
- 评测保证不会出现死锁或空队列情况。
- 在评测中，我们保证进程运行完 main 函数后自动进入死循环，而不会主动退出（详见测试目录下的 entry.S 文件）。因此，env_destroy、env_free 函数不会被调用，你无需对它们进行修改。你可以据此结合提示，简化你的实现。
- 不保证进程创建的时机
- 评测中保证不会出现 SRTF 调度队列中无可调度进程且 RR 调度队列为空的情况。
- 对于SRTF调度的进程，可能耗完时间片后程序仍然未结束运行，(例如样例中的 test_hash3 和 test_hash4)，此时它们会被移出 SRTF 调度队列，不需要额外的处理，你的实现只需保证它们的调度正确即可。

#### 本地测试说明

测试样例如下：

```
### define ENV_CREATE_SRTF(x, y)                                                                      \
	({                                                                                         \
		extern u_char binary_##x##_start[];                                                \
		extern u_int binary_##x##_size;                                                    \
		env_create_srtf(binary_##x##_start, (u_int)binary_##x##_size, y);                  \
	})

void mips_init(u_int argc, char **argv, char **penv, u_int ram_low_size) {
	printk("init.c:\tmips_init() is called\n");

	mips_detect_memory(ram_low_size);
	mips_vm_init();
	page_init();
	env_init();

	ENV_CREATE_PRIORITY(test_hash1, 1);
	ENV_CREATE_PRIORITY(test_hash2, 3);
	ENV_CREATE_SRTF(test_hash3, 5); // runtime = 5
	ENV_CREATE_SRTF(test_hash4, 2); // runtime = 2

	schedule(0);
	panic("init.c:\tend of mips_init() reached!");
}
```

你可以使用：

- `make test lab=3_srtf && make run` 在本地测试上述样例（调试模式）
- `MOS_PROFILE=release make test lab=3_srtf && make run` 在本地测试上述样例（开启优化）

运行若干时间片后，前 7 个时间片应为 SRTF 进程运行（先 2 个 hash4, 后 5 个 hash3）。之后 SRTF 队列为空，转为 RR 调度，按优先级依次运行 hash2 (优先级 3) 和 hash1 (优先级 1)。

```
   0: 00002003
   1: 00002003
   2: 00001802
   3: 00001802
   4: 00001802
   5: 00001802
   6: 00001802
   7: 00001001
   8: 00001001
   9: 00001001
  10: 00000800
  11: 00001001
  12: 00001001
  13: 00001001
  14: 00000800
  15: 00001001
  16: 00001001
env 00001001 reached end pc: 0x00400180, $v0=0x010c4a21
  17: 00001001
  18: 00000800
  19: 00001001
  20: 00001001
  21: 00001001
  22: 00000800
  23: 00001001
  24: 00001001
  25: 00001001
  26: 00000800
env 00000800 reached end pc: 0x00400180, $v0=0x00772068
  27: 00001001
  28: 00001001
  29: 00001001
  30: 00000800
test finished, halt mos!
```

#### 提交评测 & 评测标准

请在开发机中执行下列命令后，在**课程网站**上提交评测。

```
$ cd ~/学号
$ git add -A
$ git commit -m "message" # 请将 message 改为有意义的信息
$ git push
```

在线评测时，所有的 `.mk` 文件、所有的 `Makefile` 文件、`init/init.c` 以及 `tests/` 和 `tools/` 目录下的所有文件都可能被替换为标准版本，因此请同学们在本地开发时，**不要**在这些文件中编写实际功能所依赖的代码。

具体要求和分数分布如下：

| 测试点序号 | 评测说明                              | 分值 |
| ---------- | ------------------------------------- | ---- |
| 1          | 与样例相同                            | 15   |
| 2          | 混合创建进程测试,仅在初始化时创建进程 | 20   |
| 3          | 所有进程均使用 `env_create_srtf` 创建 | 15   |
| 4          | 不保证进程创建时机                    | 15   |
| 5          | 综合测试                              | 35   |

测试点依赖关系如下（箭头方向表示依赖方向）：

（原题此处为测试点依赖关系图）

### 2. Lab3 Extra：Bp 异常处理

#### 准备工作：创建并切换到 `lab3-extra-off` 分支

请在**自动初始化分支后**，在开发机依次执行以下命令：

```
$ cd ~/学号
$ git fetch
$ git checkout lab3-extra-off
```

初始化的 `lab3-extra-off` 分支基于课下完成的 `lab3` 分支，并且在 `tests` 目录下添加了 `lab3-bp` 样例测试目录。

#### 问题描述

课下实验中，我们主要介绍了异常的分发、异常向量组和 0 号异常（时钟中断）的处理过程。在本次 Extra 中，我们希望大家拓展 9 号 `Bp` 异常的异常分发，并在此基础上实现自定义的异常处理。

`Bp`异常（Breakpoint）由`break`指令触发，在 MIPS 指令集中，对该异常的描述如下：

| ExcCode | 助记符 | 描述            |
| :------ | :----- | :-------------- |
| 9       | Bp     | 执行 Break 指令 |

`break` 指令用于软件断点，其机器码格式如下：

| 31-26(op) | 25-6(code)     | 5-0(funct) | 格式       |
| --------- | -------------- | ---------- | ---------- |
| 000000    | code (20 bits) | 001101     | break code |

其中 `op` 字段恒为 0，`funct` 字段恒为 0x0d，而 `code` 字段是一个 20 位的立即数，可用于传递不同的参数。

在本次题目中，我们要实现自定义的 `Bp` 异常处理，根据 `code` 的不同取值执行不同的操作：

- 若 `code == 0x0`，表示用户断点，直接退出异常处理，继续执行后续指令。

- 若 `code == 0x6`，数组访问越界触发，程序会将数组长度存入`$a0`（4号寄存器），要求对访存指令（当前`break`指令的下一条指令）的**立即数(imm)\**部分进行检查和修改，对应索引为\**(imm >> 2)**：

  - 若越界的索引为负数，则将立即数设置为0。
  - 若越界的索引大于等于数组长度，则修改立即数，使得索引为数组长度减1，即数组的最后一个元素。

  越界检查格式如下：

  ```
  ...	// 数组长度存入$a0
  break 6
  lw/sw $t2, imm(base)
  ```

  **`base`是数组首地址，`imm`立即数是索引**。

- 若 `code == 0x7`，除零异常触发，要求获取将要发生错误的除法指令（当前`break`指令的下一条指令），并且修改除数为2。

  除零检查格式如下：

  ```
  bne $9, $zero, div_ok
  break 7
  div_ok: div $8, $9
  ```

`div`，`lw`，`sw`指令的机器码如下：

| 指令    | 31-26(op) | 25-21        | 20-16      | 15-11 | 10-6  | 5-0(funct) |
| :------ | :-------- | :----------- | :--------- | :---- | :---- | :--------- |
| **div** | 000000    | rs（被除数） | rt（除数） | 00000 | 00000 | 011010     |

| 指令   | 31-26(op) | 25-21 | 20-16 | 15-0 |
| :----- | :-------- | :---- | :---- | :--- |
| **lw** | 100011    | base  | rt    | imm  |
| **sw** | 101011    | base  | rt    | imm  |

在异常处理完成，返回用户态之前，需要输出相应信息：

- 用户断点

  ```
  printk("Break skip!\n");
  ```

- 越界检查

  ```
  printk("Out of bounds handled, new imm is : %04x!\n", new_imm);	// new_imm为替换后的立即数
  ```

- 除零检查

  ```
  printk("Divide by zero handled!\n");
  ```

**注意**：在异常处理结束前，必须让 EPC 指向下一条指令，否则会反复触发 `Bp` 异常。如果你的异常处理程序运行超时，请检查该步骤是否实现正确。

#### 题目要求

1. 建立 `Bp` 异常的处理函数。
2. 完成异常的分发，将 9 号异常绑定到该处理函数。
3. 在处理函数中，根据 break指令中的 `code` 字段实现上述三种分支，并输出相应信息。

#### 提示

1. 在 `kern/genex.S` 中，用 `BUILD_HANDLER` 宏来构建异常处理函数（切勿添加到 if 中）：

   ```
   #if !defined(LAB) || LAB >= 4
   BUILD_HANDLER mod do_tlb_mod
   BUILD_HANDLER sys do_syscall
   #endif
   
   BUILD_HANDLER reserved do_reserved
   BUILD_HANDLER bp do_bp
   ```

2. 在 `kern/traps.c` 修改异常向量组，并实现异常处理函数：

   ```
   // 声明 handle 函数
   extern void handle_bp(void);
   
   // exception_handlers 请按以下代码实现
   void (*exception_handlers[32])(void) = {
       [0 ... 31] = handle_reserved,
       [0] = handle_int,
       [2 ... 3] = handle_tlb,
       [9] = handle_bp,
   #if !defined(LAB) || LAB >= 4
       [1] = handle_mod,
       [8] = handle_sys,
   #endif
   };
   
   void do_bp(struct Trapframe *tf) {
       /* 1. 获取 break 指令及其 code */
       /* 2. 分类处理异常 */
       switch (code) {
       case 0x0:
          // 处理用户断点
          break;
       case 0x6:
          // 处理索引越界
          break;
       case 0x7:
          // 处理除数为零
          break;
       }
       return;
   }
   ```

3. 在完成处理函数时：

   - 本题涉及对寄存器值的读取和修改。你需要访问或修改保存现场的 `Trapframe` 结构体（定义在 `include/trap.h` 中）中对应通用寄存器。

   - 本题涉及到对内存的访问。

     - 可以通过**EPC寄存器增减4**获取当前指令的前后指令的虚拟地址。

     - 由于我们要修改的指令部分在 kuseg 区间，这一部分的虚拟地址需要通过 TLB 来获取物理地址。我们设置了程序中保存操作指令代码的.text节权限为只读，这部分空间在页表中仅被映射为 PTE_V，而不带有 PTE_D 权限，因此经由页表项无法对物理页进行写操作。可以考虑查询 curenv 的页表获取对应指令的物理地址，再转化为 kseg0的虚拟地址，从而修改相应内容。

     - 因为本题中对内存访问较多，建议构造虚拟地址转化到内存中指令地址的功能辅助函数。

       ```
       int *va2instrAddr(unsigned long va) {
          /* 1. 查询 curenv 的页表获取虚拟地址对应页表项; */
          /* 2. 通过页表项和虚拟地址得到物理地址; */
          /* 3. 将该物理地址转化为 kseg0 区间中虚拟地址; */
          /* 可能会使用到的函数和宏：page_lookup, PTE_ADDR, KADDR */
       }
       ```

   - 可以通过更改 CP0 中 EPC 寄存器（对应 `Trapframe` 结构体中的成员 `cp0_epc`）的值，使得异常恢复后执行的是下一条指令。

4. `MIPS` 中，`lw`/`sw` 要求地址4字节对齐。从指令立即数提取字索引时，需**右移2位**恢复原值；以字为单位的数组索引访问时，需**左移2位**转换为字节偏移。立即数不保证为正数，你需要对16位立即数的符号位进行维护（例如使用16位有符号类型 `short` 存储立即数）。

#### 题目约束

1. 测试程序 `Bp` 异常只会出现 `code` 为 0x0，0x6 和 0x7 这三种情况，不会出现其他值。
2. 测试保证所有越界异常的 `break` 指令，`base` 寄存器一定不是4号寄存器，`base` 中存储的是数组首地址。不保证 `lw` 和 `sw` 指令的立即数为正数。
3. 测试保证所有 `div` 指令都会进行除零检测且只会因为除零陷入 `Bp` 异常， `break` 指令一定是除法指令的前一条指令。除法指令只会出现`div`，且不会发生宏展开，不会发生除法溢出。
4. 本题保证发生 `Bp` 异常的指令的上一条指令不会是任意跳转指令，即保证发生 `Bp` 异常的指令**不会出现在延迟槽**中。

#### 样例输出 & 本地测试

本地测试样例如下：

```
int main() {
    unsigned int ret = 0;

    // user break
    _BUILD_BREAK_USER();

    // oob break
    int array[5] = {0, 1, 2, 3, 4};
    int len = 5;
    int dst = 5;
    int index = -1;
    _BUILD_OOB_BREAK_LW(dst, array, index, len);
    if (dst == 5) {
        ret |= BIT(0);
    } else if (dst != 0) {
        ret |= BIT(1);
    }

    // div0 break
    int rs, rt;
    rs = 0x1;
    rt = 0x0;
    _BUILD_BREAK_DIV0(rs, rt);
    if (rt == 0) {
        ret |= BIT(2);
    } else if (rt != 2) {
        ret |= BIT(3);
    }

    return ret;
}
```

你可以使用：

- `make test lab=3_bp && make run` 在本地测试上述样例（调试模式）
- `MOS_PROFILE=release make test lab=3_bp && make run` 在本地测试上述样例（开启优化）

运行正确的结果应当如下：

```
Break skip!
Out of bounds handled, new imm is : 0000!
Divide by zero handled!
[00000800] free env 00000800
i am killed ...
```

**注：如果要本地构建样例测试，由于break的机器码在 `GNU` 中与 `Mips` 不同，请使用 `.word ((<code> << 6) | 0x0d)` 代替 `break code` 进行样例构造。你也可以使用样例提供的宏定义进行测试**

#### 提交评测 & 评测标准

请在开发机中执行下列命令后，**在课程网站上提交评测**。

```
$ cd ~/学号
$ git add -A
$ git commit -m "message"  # 请将 message 改为有意义的信息
$ git push
```

在线评测时，所有的 `.mk` 文件、所有的 `Makefile` 文件、`init/init.c` 以及 `tests/` 和 `tools/` 目录下的所有文件都可能被替换为标准版本，因此请同学们在本地开发时，**不要**在这些文件中编写实际功能所依赖的代码。

具体要求和分数分布如下：

| 测试点序号 | 测试点内容                  | 测试点分值 |
| ---------- | --------------------------- | ---------- |
| 1          | 样例                        | 10分       |
| 2          | 仅有 `code = 0x0` 的 Bp异常 | 10分       |
| 3          | 仅有 `code = 0x6` 的 Bp异常 | 30分       |
| 4          | 仅有 `code = 0x7` 的 Bp异常 | 20分       |
| 5          | 多种 `code` 混合的 Bp异常   | 30分       |

测试点依赖关系如下（箭头方向表示依赖方向）：

（原题此处为测试点依赖关系图）



## 解答与反思

这次 Lab3 上机给我的印象非常深，因为它刚好安排在 OS 期中的晚上。白天刚考完试，晚上又接着上机，整个人的状态其实不是很在线，准备时间也很紧张。Lab3 本来就涉及进程调度、异常分发、Trapframe、MIPS 指令编码这些比较容易混在一起的内容，所以这次上机不是那种看完题马上能下手的感觉，而是需要先把课下代码的结构重新在脑子里跑一遍。

最后的结果也比较遗憾：Exam 部分还能围绕题意整理出比较清晰的方向，但是 Extra 我最终没有做出来。事后再看，Extra 的难度不完全在代码量，而在于它把几个知识点串到了一起：异常向量分发、`break` 指令解析、用户态指令地址到内核可写地址的转换、寄存器现场修改，以及最后的 `EPC += 4`。现场如果其中任何一个环节没想清楚，就很容易卡住。

### 1. Exam：SRTF 调度

Exam 的核心是给原来的 RR 调度再加一套 SRTF 调度队列。题目说得比较清楚：使用 `env_create_srtf` 创建的进程进入 SRTF 队列，使用原来的 `env_create` 创建的进程仍然进入 RR 队列；只要 SRTF 队列里还有剩余运行时间不为 0 的进程，就优先调度 SRTF。也就是说，它不是把 RR 改成 SRTF，而是在 RR 之上加了一个更高优先级的调度层。

我觉得这题最关键的地方有两个。

第一个是 `Env` 结构体里要补充 SRTF 需要的字段。至少需要一个链表项和两个运行时间字段，大致是：

```c
LIST_ENTRY(Env) env_srtf_sched_link;
u_int env_total_runtime;
u_int env_runtime_left;
```

其中 `env_total_runtime` 记录总共需要运行多少个时间片，`env_runtime_left` 记录当前还剩多少个时间片。真正调度时比较的是 `env_runtime_left`，如果两个进程剩余时间一样，再比较 `env_id`，选择 `env_id` 更小的进程。

第二个是 `schedule` 里要先看 SRTF 队列，再看 RR 队列。伪代码大概可以理解为：

```c
先遍历 SRTF 队列；
找到 env_runtime_left > 0 且剩余时间最短的进程；
如果剩余时间相同，选择 env_id 最小的进程；
如果找到了这样的进程：
    env_runtime_left--;
    如果 env_runtime_left == 0，就把它从 SRTF 队列里删掉；
    env_run(这个进程);
否则：
    回到原来的 RR 调度逻辑。
```

这里有一个容易写错的细节：SRTF 进程只是在“调度权”上抢占 RR 进程，但不能把 RR 进程已经消耗的时间片清零。比如 RR 进程 A 本来优先级是 5，已经跑了 3 个时间片，这时 SRTF 进程来了，那么 A 被抢占；等 SRTF 队列清空后，A 应该继续跑剩下的 2 个时间片，而不是重新从 5 个时间片开始。因此 `schedule` 里原来用来记录 RR 当前时间片消耗情况的静态变量不能随便重置，必要时还要额外记录上一次 RR 调度到哪个进程。

我一开始看题时容易把重点放在“怎么找最短剩余时间”上，但其实这个遍历并不难，真正容易出问题的是和原有 RR 逻辑的衔接。尤其是 `curenv`、`count`、`yield` 这些变量原本就比较绕，如果为了加 SRTF 直接把原来的 RR 代码结构改乱，就会导致样例里 SRTF 跑完后 RR 的输出序列不对。

### 2. Extra：Bp 异常处理

Extra 是我这次没有做出来的部分。现在回头看，它本质上不是单独考一个知识点，而是在考“发生异常以后，内核到底能拿到什么，又应该改哪里”。

第一步是异常分发。要在 `kern/genex.S` 里用 `BUILD_HANDLER bp do_bp` 建立处理入口，然后在 `kern/traps.c` 的异常处理函数表里把 9 号异常绑定到 `handle_bp`。这一步本身不算难，但如果对异常向量组不熟，很容易不知道代码应该加在哪里。

第二步是从 `Trapframe` 里拿到当前触发异常的指令地址，也就是 `tf->cp0_epc`。`break` 指令的 `code` 字段在机器码的第 25 到第 6 位，所以可以按下面这种思路取出来：

```c
instr = *(转换后的 epc 对应指令地址);
code = (instr >> 6) & 0xfffff;
```

这里最容易忽略的是：`tf->cp0_epc` 指向的是当前这条 `break` 指令。如果异常处理完不把 `EPC` 往后推 4，那么返回用户态后还会继续执行同一条 `break`，于是就会无限触发 Bp 异常，表现出来通常就是超时。所以无论处理哪一种 `code`，最后都要保证执行到下一条指令。

第三步是分情况处理。

`code == 0x0` 是最简单的用户断点，只需要打印 `Break skip!`，然后跳过当前 `break` 即可。

`code == 0x6` 是数组越界检查。题目要求修改的是 `break` 后面那条 `lw/sw` 指令的立即数部分。这里需要注意两个细节：第一，立即数是 16 位有符号数，不能直接当无符号数处理；第二，题目说索引为 `imm >> 2`，因为 MIPS 里的 `lw/sw` 立即数是字节偏移，而数组索引是按 4 字节一个 `int` 来算的。也就是说，负数下标要改成 0，超过数组长度的下标要改成 `(len - 1) << 2`。

`code == 0x7` 是除零检查。它不是要改 `div` 指令本身，而是要根据 `div` 指令里的 `rt` 字段找到除数寄存器，然后把保存现场里的这个寄存器值改成 2。这样异常返回后，下一条 `div` 指令执行时，除数就不再是 0。

Extra 最卡我的地方，其实是“怎么改用户程序里的指令”。题目提示里已经说了，`.text` 段在页表里是只读映射，直接通过用户虚拟地址去写会有问题，所以应该通过 `page_lookup` 找到对应物理页，再用 `KADDR` 转成 kseg0 地址来修改。这个地方如果现场没有把 `kuseg -> 页表 -> 物理地址 -> kseg0` 这条路径想清楚，代码基本就写不下去了。

### 3. 这次上机的教训

这次最大的教训是：Lab3 这种题不能只背课下代码的表面流程。Exam 看起来只是调度算法替换，但它实际上要求理解原来 RR 调度的状态是怎么保存的；Extra 看起来只是加一个异常处理函数，但它实际上要求理解异常发生后内核如何通过 `Trapframe` 修改用户态执行现场。

如果重新准备这次上机，我会把重点放在三件事上：

1. 先把 `env_create`、`env_run`、`schedule` 的调用关系画一遍，尤其搞清楚 RR 的 `count` 到底代表什么；
2. 把 `Trapframe` 里常用字段的位置看熟，至少要知道 EPC 和通用寄存器怎么访问；
3. 提前熟悉 MIPS 指令格式，尤其是 `break`、`lw/sw`、`div` 这几类题目里很可能出现的指令。

这次 Extra 没做出来确实比较可惜，但它也暴露了一个问题：我对异常处理的理解还停留在“知道会跳到内核处理”的层面，而没有真正熟悉“内核如何修改用户程序接下来要执行的东西”。Lab3 之后再看前面的内存管理和异常处理，其实会发现这些内容是连在一起的，不是孤立的知识点。

总的来说，Lab3 上机比 Lab2 更像一次综合题。它不只是问某个函数怎么写，而是要求在已有 OS 框架里加一块新机制，并且不能破坏原有机制。以后复习 OS 上机时，这类“在原机制上叠加新机制”的题目应该重点练习。

