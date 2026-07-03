# OS Lab2 上机-问题总结与反思

## 题面复原

### 1.Lab2_list_insert_at

#### Lab 2 Exam Offline

##### 准备工作：创建并切换到 `lab2-exam-off` 分支

1. **基于已完成的 lab2 提交自动初始化 lab2-exam 分支**

2. 在开发机依次执行以下命令：

   ```
   $ cd ~/学号
   $ git fetch
   $ git checkout lab2-exam-off
   ```

初始化的 `lab2-exam-off` 分支基于课下完成的 `lab2` 分支，并且在 `tests` 目录下添加了 `lab2_list_insert_at` 样例测试目录。

##### 题目背景 & 题目描述

在操作系统内核中，双向链表（如 `<queue.h>` 中定义的 `LIST` 系列宏）被广泛应用于物理内存页管理、进程控制块队列等重要数据结构的维护。现有的链表宏提供了头部插入（`LIST_INSERT_HEAD`）、在特定元素前后插入（`LIST_INSERT_AFTER` / `LIST_INSERT_BEFORE`）等功能。

在某些特定的调度或分配场景下，我们需要将一个元素插入到链表的**特定索引位置**。在本题中，你需要实现一个新的 C 语言宏 `LIST_INSERT_AT`，**将指定的元素插入到给定链表的第 `index` 个位置**。

```
#define LIST_INSERT_AT(type, head, elm, field, index)
```

该宏各参数的意义与具体功能描述如下：

通过调用此宏，将元素 `elm` 插入到链表 `head` 的第 `index` 个位置（**索引从 0 开始**）。

- `type`：链表节点对应的结构体类型名（例如 `Page`）。

- `head`：指向链表头部的指针。

- `elm`：待插入的元素指针。

- `field`：结构体中用于链接的 `LIST_ENTRY` 字段名（例如 `pp_link`）。

- ```
  index
  ```

  ：目标插入位置的索引。

  - 如果 `index == 0`，则将 `elm` 插入到链表的最头部，使其成为链表新的首个元素（即第 `0` 个元素）。
  - 如果 `index > 0`，则将其插入到原链表第 `index - 1` 个元素的**后面**。
  - 测试样例保证传入的 `index` **大于等于 0 且小于等于当前链表的长度**（当 `index` 等于链表长度时，意味着将元素追加到链表最尾部）。
  - 测试样例保证传入的 `index` 表达式不存在副作用。

##### 题目要求

在 `include/queue.h` 中添加 `LIST_INSERT_AT` 宏的定义。

##### 提示

1. 本题**要求使用宏实现**，不能使用普通的 C 函数。在评测中，测试代码可能会将不同的类型名（如 `Page`）作为参数传入，普通函数无法接收类型名作为参数。

2. 可以组合使用已有的链表宏。例如：

   - 当 `index == 0` 时，可以直接调用 `LIST_INSERT_HEAD`。
   - 当 `index > 0` 时，可以使用 `LIST_FOREACH` 宏配合自定义的计数器遍历链表，找到对应的节点后使用 `LIST_INSERT_AFTER` 插入。

3. 注意 C 语言宏的安全编程规范

   ：

   - 宏的外部应使用 `do { ... } while (0)` 包裹以保证语法的安全性。
   - 宏内部使用传入的参数时，建议加上括号（如 `(index)`），防止表达式优先级导致的逻辑错误。
   - 宏内部声明临时变量时（如计数器变量或迭代指针），建议使用带有下划线前缀的命名（如 `_cnt`, `_var`），以防止与外部作用域的变量名发生冲突。

4. 评测会借助课下已给出的 `include/queue.h` 中的相关链表宏，请保证没有对官方代码进行魔改。

##### 样例输出 & 本地测试

对于以下样例：

```
#include <mmu.h>
#include <pmap.h>
#include <print.h>

void test_list_insert_at() {
    struct Page_list test_list;
    LIST_INIT(&test_list);

    struct Page *pages = (struct Page *)alloc(5 * sizeof(struct Page), PAGE_SIZE, 1);

    LIST_INSERT_AT(Page, &test_list, &pages[0], pp_link, 0);
    LIST_INSERT_AT(Page, &test_list, &pages[2], pp_link, 1);
    LIST_INSERT_AT(Page, &test_list, &pages[1], pp_link, 1);
    LIST_INSERT_AT(Page, &test_list, &pages[3], pp_link, 0);
    LIST_INSERT_AT(Page, &test_list, &pages[4], pp_link, 4);

    struct Page *answer[] = {
        &pages[3],
        &pages[0],
        &pages[1],
        &pages[2],
        &pages[4]
    };

    struct Page *p = LIST_FIRST(&test_list);
    int j = 0;

    while (p != NULL) {
        assert(p == answer[j++]);
        p = LIST_NEXT(p, pp_link);
    }
    assert(j == 5);

    printk("test succeeded!\n");
}
```

其应当输出：

```
test succeeded!
```

你可以使用：

`make test lab=2_list_insert_at && make run` 在本地测试上述样例（调试模式）

`MOS_PROFILE=release make test lab=2_list_insert_at && make run` 在本地测试上述样例（开启优化）

或者在 `init/init.c` 的 `mips_init` 函数中自行编写测试代码并调用 `test_list_insert_at()` 使用 `make && make run` 测试。

##### 提交评测 & 评测标准

请在开发机中执行下列命令后，在**课程网站上提交评测**。

```
$ cd ~/学号/
$ git add -A
$ git commit -m "message" # 请将 message 改为有意义的信息
$ git push
```

测试点说明及分数分布如下：

| 测试点序号 | 评测说明                                            | 分值  |
| ---------- | --------------------------------------------------- | ----- |
| 1          | 与样例相同                                          | 10 分 |
| 2          | 仅测试基于空链表及非空链表的头部插入 (`index == 0`) | 20 分 |
| 3          | 仅测试在链表中间位置的插入 (`0 < index < length`)   | 25 分 |
| 4          | 仅测试在链表末尾追加元素 (`index == length`)        | 25 分 |
| 5          | 综合评测                                            | 20 分 |

---

### 2.Lab2_selfmap

#### Lab 2 Extra Offline

##### 准备工作：创建并切换到 `lab2-extra-off` 分支

请在**自动初始化分支后**，在开发机依次执行以下命令：

```
$ cd ~/学号
$ git fetch
$ git checkout lab2-extra-off
```

初始化的 `lab2-extra-off` 分支基于课下完成的 `lab2` 分支，并且在 `tests` 目录下添加了 `lab2_selfmap` 样例测试目录。

##### 题目背景

自映射是我们 MOS 中的一大特色，也是理论考试中经常会出现的重难点。在本次实验中，我们将会通过一段简单的讲解，以及一道有趣的题目，带大家深入理解自映射的作用、原理和实现方法。

如果你确信自己已经充分理解了自映射，那么可以跳过本章的内容，直接阅读**题目描述**一章。

我们知道，在 MOS 的两级页表设计中，每个进程将 1 个 4 KB 的页面作为页目录，页目录中有 1024 个 4 Bytes 的页目录项，分别指向 1024 张页表。每张页表依然占据 1 个 4 KB 的页面，每张页表中有 1024 个 4 Bytes 的页表项，分别指向 1024 个物理页面。这样，我们就能够通过页表查询到 1024 * 1024 * 4KB = 4GB ，即 32 位的虚拟地址空间对应的物理页面。

在目前的 MOS 中，我们只能通过访问 kseg0 段的虚拟地址来访问页表，这就限制了我们只能在内核态访问它们。在之后的实验中，我们希望能够在用户态以只读的模式访问到页表，这样就可以将许多本来需要在内核态才能完成的操作移至用户态，体现微内核的思想。同时，不允许在用户态修改页表的内容，也保证了操作系统内核的安全。

那么，如果我们想要在用户态读取到页表中的内容，就需要使用 kuseg 段的虚拟地址与页表的物理页面之间建立映射。于是我们考虑划出一个 1024 * 4KB = 4MB 大小的虚拟地址空间，将其依次与 1024 张页表建立映射。我们假设这段虚拟地址是 `[0x7fc00000, 0x80000000)` ，于是它们的映射关系如下图所示：

![lab2-extra1.png](https://os.buaa.edu.cn/public/23373440/extra/lab2-extra1.png)

**（如果你无法准确分辨图片中的颜色，请及时联系助教，助教可以帮你指出图中的颜色）**

图中上方的条形图为整个 4GB 的虚拟地址空间，其中蓝色的方块代表着 1024 张页表对应的 4MB 虚拟地址空间。我们将这部分虚拟空间放大来看，就得到了下方的条形图，其中每个方块代表着 1 张页表对应的 4KB 虚拟地址空间。

我们来分析一下此时该如何通过 kuseg 段虚拟地址访问到任意页表。我们首先给出要访问的页表的虚拟地址，显然这个虚拟地址一定位于 `[0x7fc00000, 0x80000000)` 范围内，即 4GB 虚拟地址空间中的第 511 个 4MB 虚拟地址空间（从 0 计数，下同），于是我们找到页目录（图中金色的部分）中的第 511 条页目录项，并据此找到第 511 张页表（图中橙色的部分）。

接下来根据要访问的页表在 kuseg 段的虚拟地址，我们在橙色页表中寻找对应的页表项，并据此找到对应的页表。假设我们要访问的是第 1 张页表，那么上述过程就如下图红色箭头所示：

![lab2-extra2.png](https://os.buaa.edu.cn/public/23373440/extra/lab2-extra2.png)

我们知道，操作系统在启动的时候不会一次性创建全部的 1024 张页表，而是在程序运行的过程中动态创建。从上述过程中我们能够看出，如果需要创建一个新页表，我们原本只需要维护页目录中指向新页表的页目录项，现在则还需要再维护橙色页表中指向新页表的页表项，这样才能够保证我们可以使用 kuseg 段虚拟地址访问到页表。然而从上图中我们可以看出，页目录和橙色页表的所有表项实际上都是完全相同的，于是我们就可以直接用页目录替换掉橙色页表，这就是所谓的自映射：

![lab2-extra3.png](https://os.buaa.edu.cn/public/23373440/extra/lab2-extra3.png)

在之前的设计中，页目录的第 511 条页目录项指向橙色页面。经过替换之后，页目录的第 511 条页目录项就指向了自己。也就是说，这个页面既是页目录，又是 1024 张页表中的第 511 张页表，真的是太美妙了！

到这里，相信你已经充分理解了自映射的含义，让我们开始接下来的挑战吧！

提示：在使用页目录替换掉橙色页表之后，我们就不再需要额外维护原本橙色页表中的页表项了。不过，在建立自映射的时候，你还需要额外维护 1 个页目录项，以确保页目录的某条表项指向自己。

##### 题目描述

在本题中，你需要在 MOS 中模拟自映射的建立、查询与解除。具体来说，你需要实现 `create_self_map()` `pte_va()` `pde_va()` `remove_all_self_map()` 4 个函数。

###### 自映射的建立

`create_self_map()` 函数的功能为：给定页目录首地址 `pgdir` 和 `asid` ，将所有页表自映射至 `[base, base + 1024 * PAGE_SIZE)` 的连续 4MB 虚拟地址空间。你可以参考如下实现流程：

1. 遍历 `[base, base + 1024 * PAGE_SIZE)` 的虚拟地址，检查其是否已经与物理页面建立了映射。如果已经建立了映射，则使用 `page_remove()` 函数解除映射，并使用计数变量 `count` 记录已经解除的映射数量；
2. 将所有页表自映射至 `[base, base + 1024 * PAGE_SIZE)` 的地址空间。这里要注意的是，你需要手动为页目录项加上合适的权限位，保证其有效且不可写，如果你在实现这一步时遇到了困难，请仔细阅读**题目背景**一章的内容；
3. 返回计数变量 `count` 的值。

###### 自映射的查询

`pte_va()` 函数的功能为：给定自映射虚拟地址空间的首地址 `base` ，计算使用自映射访问第 `pdeno` 张页表的第 `pteno` 个页表项时，**需要使用的虚拟地址**。

`pde_va()` 函数的功能为：给定自映射虚拟地址空间的首地址 `base` ，计算使用自映射访问页目录中的第 `pdeno` 个页目录项时，**需要使用的虚拟地址**。

这两个函数请你根据对自映射的理解自行实现，在这里不给出过多的提示。使用合适的位运算，你可以分别使用一行代码完成这两个函数。

###### 自映射的解除

`remove_all_self_map()` 函数的功能为：给定页目录首地址 `pgdir` 和 `asid` ，解除当前已经建立的**所有**自映射。你可以参考如下实现流程：

1. 遍历所有页目录项，找到其中用于实现自映射的表项，将表项清空以解除自映射，并使用计数变量 `count` 记录已经解除的自映射数量，如果你在实现这一步时遇到了困难，请仔细阅读**题目背景**一章的内容；
2. 通过上述表项的地址相对于页目录首地址的偏移，计算自映射虚拟地址空间的首地址 `base` ；
3. 对于每一个解除的自映射，遍历 `[base, base + 1024 * PAGE_SIZE)` 的虚拟地址，清空其在 TLB 中的缓存；
4. 返回计数变量 `count` 的值。

##### 提示 & 注意事项

1. 在整道题目中，我们均**不考虑**页控制块（即 `Page` 结构体）中 `pp_ref` 字段的变化。
2. 由于我们尚未实现进程管理与用户态，在本题中，我们认为整个操作系统中只存在 1 张页目录，其基地址即为函数中的参数 `Pde *pgdir` 。另外注意，请不要使用 `cur_pgdir` 这个全局变量。
3. 在测试数据中，我们保证不会出现两次自映射虚拟地址空间相同的情况。不过在自映射解除之后，其虚拟地址依然有可能与其它物理页面建立映射，你需要维护好 TLB 表项。
4. 在测试数据中，我们保证 `pgdir` 为正确的页目录首地址，保证 `asid` 为 0 到 255 之间的整数，保证 `base` 在 kuseg 段范围内且为 1024 * PAGE_SIZE 的倍数，保证 `pdeno` 和 `pteno` 为 0 到 1023 之间的整数。

##### 实验提供代码

请将本部分提供代码附加在你的 `include/pmap.h` 中：

```
int create_self_map(Pde *pgdir, u_int asid, u_long base);
u_long pte_va(u_long base, u_int pdeno, u_int pteno);
u_long pde_va(u_long base, u_int pdeno);
int remove_all_self_map(Pde *pgdir, u_int asid);
```

请将本部分提供代码附加在你的 `kern/pmap.c` 的尾部，然后开始完成题目。

```
int create_self_map(Pde *pgdir, u_int asid, u_long base) {
	int count = 0;
	/* Your Code Here (1/4) */
	return count;
}

u_long pte_va(u_long base, u_int pdeno, u_int pteno) {
	/* Your Code Here (2/4) */
}

u_long pde_va(u_long base, u_int pdeno) {
	/* Your Code Here (3/4) */
}

int remove_all_self_map(Pde *pgdir, u_int asid) {
	int count = 0;
	/* Your Code Here (4/4) */
	return count;
}
```

##### 本地测试说明

你可以使用：

- `make test lab=2_selfmap && make run` 在本地测试上述样例（调试模式）
- `MOS_PROFILE=release make test lab=2_selfmap && make run` 在本地测试上述样例（开启优化）

或者在 `init/init.c` 的 `mips_init` 函数中自行编写测试代码并使用 `make && make run` 测试。

如果样例测试中输出了如下结果，说明你通过了本地测试。

```
Congratulations! You passed the local test!
```

**提示：本地测试为综合测试，即使无法通过本地测试，只要有部分功能是正确的，也有可能通过线上评测的部分测试点，请积极尝试提交，尽量提高自己的分数！**

##### 提交评测

请在开发机中执行下列命令后，**在课程网站上提交评测**。

```
$ cd ~/学号/
$ git add -A
$ git commit -m "message" # 请将 message 改为有意义的信息
$ git push
```

##### 评测说明

评测时使用的 `mips_init()` 函数示意如下：

```
void mips_init() {
	mips_detect_memory();
	mips_vm_init();
	page_init();

	test_selfmap();

	halt();
}
```

`test_selfmap()` 函数会被测试文件中的函数替代，请不要修改其中的内容。

具体要求和分数分布如下：

| 测试点序号 | 评测说明                                                     | 分值 |
| :--------: | ------------------------------------------------------------ | :--: |
|     1      | 检查 `pte_va()` 函数和 `pde_va()` 函数的计算结果             |  30  |
|     2      | 检查 `create_self_map()` 函数中原有映射的解除与自映射的建立  |  20  |
|     3      | 检查 `remove_all_self_map()` 函数中自映射的解除与 TLB 的维护 |  20  |
|     4      | 检查 `create_self_map()` 函数和 `remove_all_self_map()` 函数的返回值 |  10  |
|     5      | 综合测试                                                     |  20  |

测试点依赖关系如下（箭头方向表示依赖方向）：

case:1case:2case:3case:4case:5

## 解答与反思

这次 Lab2 上机比 P0 更像是一次“把课下代码真正用明白”的检查。两道题看起来不长，但分别卡在两个很典型的点上：第一题考的是 C 语言宏和链表接口的边界，第二题考的是对两级页表、自映射和 TLB 维护的理解。真正做的时候，不能只凭感觉写代码，而要把已有宏、页目录项、页表项、虚拟地址拆分方式这些基础概念对齐。

### 1.LIST_INSERT_AT：难点不是插入，而是“像宏一样插入”

这题一开始看起来很像普通的链表插入函数：如果 `index == 0`，就插到头部；否则找到原链表第 `index - 1` 个元素，再插到它后面。但题目要求必须用宏实现，这就带来了几个额外注意点。

首先，`type` 传入的是结构体类型名，比如样例中的 `Page`。在 MOS 的 `queue.h` 风格里，链表节点一般写作 `struct Page`，所以宏内部声明临时遍历变量时，不能想当然写成 `type *_var`，更稳妥的写法是：

```c
struct type *_var;
```

其次，宏外层必须用 `do { ... } while (0)` 包起来。这个点看起来很形式化，但如果宏被写在 `if (...) LIST_INSERT_AT(...); else ...` 这样的语境里，不包起来就很容易产生语法层面的坑。

我最后整理出来的核心写法大概是这样：

```c
#define LIST_INSERT_AT(type, head, elm, field, index) do {                      if ((index) == 0) {                                                             LIST_INSERT_HEAD((head), (elm), field);                                  } else {                                                                       int _cnt = 0;                                                                struct type *_var;                                                           LIST_FOREACH(_var, (head), field) {                                             if (_cnt == (index) - 1) {                                                      LIST_INSERT_AFTER(_var, (elm), field);                                       break;                                                                   }                                                                           _cnt++;                                                                  }                                                                       }                                                                       } while (0)
```

这里比较容易想漏的是 `index == length` 的情况。题目保证 `index` 不会越界，所以当 `index` 等于当前链表长度时，遍历一定能走到最后一个元素，此时 `_cnt == index - 1`，直接 `LIST_INSERT_AFTER` 就是在尾部追加。也就是说，不需要单独写“尾插”的特殊情况。

这道题给我的最大提醒是：OS 里的链表宏不是“会用就行”，还要理解它为什么能做到类型无关、为什么参数里要传 `field`、为什么官方宏都喜欢写成 `do { ... } while (0)`。这些细节平时看起来不起眼，但上机题正好会拿来考。

### 2.Selfmap：核心是把“页表也是页”这件事想清楚

第二题比第一题更有 OS 味道。它并不是单纯让我们补四个函数，而是在问一个问题：如果页表本身也是物理页，那么能不能通过虚拟地址把这些页表也映射出来？答案就是自映射。

我理解这题的关键有三层。

第一层是 `pte_va()`。自映射区域 `[base, base + 1024 * PAGE_SIZE)` 一共 4MB，正好可以放下 1024 张页表。每张页表占 4KB，所以第 `pdeno` 张页表在这段区域里的起始地址就是：

```c
base + pdeno * PAGE_SIZE
```

而一张页表里有 1024 个页表项，每个页表项 4 字节，所以第 `pteno` 个页表项的虚拟地址就是：

```c
u_long pte_va(u_long base, u_int pdeno, u_int pteno) {
    return base + pdeno * PAGE_SIZE + pteno * sizeof(Pte);
}
```

第二层是 `pde_va()`。这个函数更容易绕，因为它不是问“某张普通页表的某个 PTE 在哪里”，而是问“页目录项 PDE 在自映射区域里怎么访问”。自映射的本质是让某个页目录项指向页目录自己。设 `base` 所在的页目录项编号为 `PDX(base)`，那么第 `PDX(base)` 张“页表”其实就是页目录本身。因此访问第 `pdeno` 个 PDE，就等价于访问自映射区域中第 `PDX(base)` 张页表的第 `pdeno` 个表项：

```c
u_long pde_va(u_long base, u_int pdeno) {
    return base + PDX(base) * PAGE_SIZE + pdeno * sizeof(Pde);
}
```

也可以写成：

```c
return pte_va(base, PDX(base), pdeno);
```

这其实是整道题最“顿悟”的地方：页目录在自映射以后，同时也扮演了一张页表。

第三层是建立和解除自映射。`create_self_map()` 不是直接写一个页目录项就结束了。题目要求先检查 `[base, base + 1024 * PAGE_SIZE)` 这段虚拟地址空间中原本有没有映射，如果有，要先 `page_remove()` 掉，并且用 `count` 记录删掉了多少个已有映射。之后只需要让 `pgdir[PDX(base)]` 指向 `pgdir` 自己即可。权限上要保证有效、不可写，所以关键是不要加写权限位。

核心思路可以概括成：

```c
int create_self_map(Pde *pgdir, u_int asid, u_long base) {
    int count = 0;
    for (u_long va = base; va < base + 1024 * PAGE_SIZE; va += PAGE_SIZE) {
        if (page_lookup(pgdir, va, NULL) != NULL) {
            page_remove(pgdir, asid, va);
            count++;
        }
    }
    pgdir[PDX(base)] = PADDR(pgdir) | PTE_V;
    return count;
}
```

这里最容易犯的错有两个：一个是把“建立 1024 个页表映射”误解成要循环填 1024 个页目录项；另一个是忘记先解除原有映射。事实上，自映射最妙的地方就在于只要某个页目录项指向页目录自身，那么这 4MB 虚拟空间里看到的 1024 个页表入口，本质上就来自页目录本身已有的 1024 个 PDE。

`remove_all_self_map()` 的判断标准则反过来：遍历所有页目录项，找到那些“有效并且物理地址等于页目录物理地址”的项，这些就是当前建立过的自映射。清空它们之后，要根据页目录项下标反推出对应的 `base`，再把这段 4MB 自映射区间对应的 TLB 项清掉。

核心思路可以写成：

```c
int remove_all_self_map(Pde *pgdir, u_int asid) {
    int count = 0;
    u_long pgdir_pa = PADDR(pgdir);

    for (u_int i = 0; i < 1024; i++) {
        if ((pgdir[i] & PTE_V) && PTE_ADDR(pgdir[i]) == pgdir_pa) {
            pgdir[i] = 0;
            count++;

            u_long base = i << PDSHIFT;
            for (u_int j = 0; j < 1024; j++) {
                tlb_invalidate(asid, base + j * PAGE_SIZE);
            }
        }
    }
    return count;
}
```

这部分我觉得真正要注意的是 TLB。页表项被改掉，不代表处理器已经不会用旧的地址翻译结果了。尤其这题明确要求解除自映射以后维护 TLB，所以只清空页目录项而不 invalidate，很可能本地看起来还能跑，评测却在综合点上挂掉。

### 总结

这次 Lab2 上机的两道题分别对应了两个容易被忽视的基础能力：

- `LIST_INSERT_AT` 考的是能不能在已有宏体系里安全地扩展一个宏，而不是重新写一套链表；
- `selfmap` 考的是能不能真正理解二级页表结构，而不是机械背 `page_lookup`、`page_insert`、`page_remove` 的调用方式。

如果说 P0 上机更多是在考“能不能把逻辑电路搭出来”，那么 Lab2 上机更像是在考“你是否真的理解了框架代码背后的抽象”。链表宏这题提醒我，C 语言里很多看似语法层面的东西，其实直接影响内核代码的可靠性；自映射这题提醒我，页目录、页表和普通物理页并不是三种完全割裂的东西，它们本质上都可以被地址空间重新组织和解释。

附上我课后整理时最想记住的一句话：

> 自映射不是多维护一套页表，而是让页目录在虚拟地址空间中“看见自己”。
